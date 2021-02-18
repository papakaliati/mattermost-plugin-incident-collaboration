package incident

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/pkg/errors"
	stripmd "github.com/writeas/go-strip-markdown"

	"github.com/mattermost/mattermost-plugin-incident-collaboration/server/bot"
	"github.com/mattermost/mattermost-plugin-incident-collaboration/server/config"
	"github.com/mattermost/mattermost-plugin-incident-collaboration/server/playbook"
	"github.com/mattermost/mattermost-plugin-incident-collaboration/server/timeutils"
	"github.com/mattermost/mattermost-server/v5/model"

	pluginapi "github.com/mattermost/mattermost-plugin-api"
)

const (
	// IncidentCreatedWSEvent is for incident creation.
	IncidentCreatedWSEvent = "incident_created"
	incidentUpdatedWSEvent = "incident_updated"
	noAssigneeName         = "No Assignee"
)

// ServiceImpl holds the information needed by the IncidentService's methods to complete their functions.
type ServiceImpl struct {
	pluginAPI     *pluginapi.Client
	configService config.Service
	store         Store
	poster        bot.Poster
	logger        bot.Logger
	scheduler     JobOnceScheduler
	telemetry     Telemetry
}

var allNonSpaceNonWordRegex = regexp.MustCompile(`[^\w\s]`)

// DialogFieldPlaybookIDKey is the key for the playbook ID field used in OpenCreateIncidentDialog.
const DialogFieldPlaybookIDKey = "playbookID"

// DialogFieldNameKey is the key for the incident name field used in OpenCreateIncidentDialog.
const DialogFieldNameKey = "incidentName"

// DialogFieldDescriptionKey is the key for the incident description field used in OpenCreateIncidentDialog.
const DialogFieldDescriptionKey = "incidentDescription"

// DialogFieldMessageKey is the key for the message textarea field used in UpdateIncidentDialog
const DialogFieldMessageKey = "message"

// DialogFieldReminderInSecondsKey is the key for the reminder select field used in UpdateIncidentDialog
const DialogFieldReminderInSecondsKey = "reminder"

// DialogFieldStatusKey is the key for the status select field used in UpdateIncidentDialog
const DialogFieldStatusKey = "status"

// NewService creates a new incident ServiceImpl.
func NewService(pluginAPI *pluginapi.Client, store Store, poster bot.Poster, logger bot.Logger,
	configService config.Service, scheduler JobOnceScheduler, telemetry Telemetry) *ServiceImpl {
	return &ServiceImpl{
		pluginAPI:     pluginAPI,
		store:         store,
		poster:        poster,
		logger:        logger,
		configService: configService,
		scheduler:     scheduler,
		telemetry:     telemetry,
	}
}

// GetIncidents returns filtered incidents and the total count before paging.
func (s *ServiceImpl) GetIncidents(requesterInfo RequesterInfo, options FilterOptions) (*GetIncidentsResults, error) {
	return s.store.GetIncidents(requesterInfo, options)
}

// CreateIncident creates a new incident. userID is the user who initiated the CreateIncident.
func (s *ServiceImpl) CreateIncident(incdnt *Incident, userID string, public bool) (*Incident, error) {
	// Try to create the channel first
	channel, err := s.createIncidentChannel(incdnt, public)
	if err != nil {
		return nil, err
	}

	incdnt.ChannelID = channel.Id
	incdnt.CreateAt = model.GetMillis()

	// Start with a blank playbook with one empty checklist if one isn't provided
	if incdnt.PlaybookID == "" {
		incdnt.Checklists = []playbook.Checklist{
			{
				Title: "Checklist",
				Items: []playbook.ChecklistItem{},
			},
		}
		incdnt.Propertylist = playbook.Propertylist{
			ID:    DialogFieldPlaybookIDKey,
			Title: "",
			Items: []playbook.PropertylistItem{},
		}
	}

	incdnt, err = s.store.CreateIncident(incdnt)
	if err != nil {
		return nil, errors.Wrapf(err, "failed to create incident")
	}

	s.telemetry.CreateIncident(incdnt, userID, public)

	user, err := s.pluginAPI.User.Get(incdnt.CommanderUserID)
	if err != nil {
		return nil, errors.Wrapf(err, "failed to resolve user %s", incdnt.CommanderUserID)
	}

	newPost, err := s.poster.PostMessage(channel.Id, "This incident has been started by @%s", user.Username)
	if err != nil {
		return nil, errors.Wrapf(err, "failed to post to incident channel")
	}

	event := &TimelineEvent{
		IncidentID:    incdnt.ID,
		CreateAt:      incdnt.CreateAt,
		EventAt:       incdnt.CreateAt,
		EventType:     IncidentCreated,
		PostID:        newPost.Id,
		SubjectUserID: incdnt.CommanderUserID,
	}

	if _, err = s.store.CreateTimelineEvent(event); err != nil {
		return incdnt, errors.Wrap(err, "failed to create timeline event")
	}
	incdnt.TimelineEvents = append(incdnt.TimelineEvents, *event)

	if incdnt.PostID == "" {
		return incdnt, nil
	}

	// Post the content and link of the original post
	post, err := s.pluginAPI.Post.GetPost(incdnt.PostID)
	if err != nil {
		return nil, errors.Wrapf(err, "failed to get incident original post")
	}

	siteURL := model.SERVICE_SETTINGS_DEFAULT_SITE_URL
	if s.pluginAPI.Configuration.GetConfig().ServiceSettings.SiteURL != nil {
		siteURL = *s.pluginAPI.Configuration.GetConfig().ServiceSettings.SiteURL
	}
	postURL := fmt.Sprintf("%s/_redirect/pl/%s", siteURL, incdnt.PostID)
	postMessage := fmt.Sprintf("[Original Post](%s)\n > %s", postURL, post.Message)

	_, err = s.poster.PostMessage(channel.Id, postMessage)
	if err != nil {
		return nil, errors.Wrapf(err, "failed to post to incident channel")
	}

	return incdnt, nil
}

// OpenCreateIncidentDialog opens a interactive dialog to start a new incident.
func (s *ServiceImpl) OpenCreateIncidentDialog(teamID, commanderID, triggerID, postID, clientID string, playbooks []playbook.Playbook, isMobileApp bool) error {
	dialog, err := s.newIncidentDialog(teamID, commanderID, postID, clientID, playbooks, isMobileApp)
	if err != nil {
		return errors.Wrapf(err, "failed to create new incident dialog")
	}

	dialogRequest := model.OpenDialogRequest{
		URL: fmt.Sprintf("/plugins/%s/api/v0/incidents/dialog",
			s.configService.GetManifest().Id),
		Dialog:    *dialog,
		TriggerId: triggerID,
	}

	if err := s.pluginAPI.Frontend.OpenInteractiveDialog(dialogRequest); err != nil {
		return errors.Wrapf(err, "failed to open new incident dialog")
	}

	return nil
}

func (s *ServiceImpl) OpenUpdateStatusDialog(incidentID string, triggerID string) error {
	currentIncident, err := s.store.GetIncident(incidentID)
	if err != nil {
		return errors.Wrap(err, "failed to retrieve incident")
	}

	message := ""
	newestPostID := findNewestNonDeletedPostID(currentIncident.StatusPosts)
	if newestPostID != "" {
		var post *model.Post
		post, err = s.pluginAPI.Post.GetPost(newestPostID)
		if err != nil {
			return errors.Wrap(err, "failed to find newest post")
		}
		message = post.Message
	} else {
		message = currentIncident.ReminderMessageTemplate
	}

	dialog, err := s.newUpdateIncidentDialog(message, currentIncident.BroadcastChannelID, currentIncident.CurrentStatus(), currentIncident.PreviousReminder)
	if err != nil {
		return errors.Wrap(err, "failed to create update status dialog")
	}

	dialogRequest := model.OpenDialogRequest{
		URL: fmt.Sprintf("/plugins/%s/api/v0/incidents/%s/update-status-dialog",
			s.configService.GetManifest().Id,
			incidentID),
		Dialog:    *dialog,
		TriggerId: triggerID,
	}

	if err := s.pluginAPI.Frontend.OpenInteractiveDialog(dialogRequest); err != nil {
		return errors.Wrap(err, "failed to open update status dialog")
	}

	return nil
}

func (s *ServiceImpl) broadcastStatusUpdate(statusUpdate string, theIncident *Incident, authorID, originalPostID string) error {
	incidentChannel, err := s.pluginAPI.Channel.Get(theIncident.ChannelID)
	if err != nil {
		return err
	}

	incidentTeam, err := s.pluginAPI.Team.Get(theIncident.TeamID)
	if err != nil {
		return err
	}

	author, err := s.pluginAPI.User.Get(authorID)
	if err != nil {
		return err
	}

	duration := timeutils.DurationString(timeutils.GetTimeForMillis(theIncident.CreateAt), time.Now())

	broadcastedMsg := fmt.Sprintf("# Incident Update: [%s](/%s/pl/%s)\n", incidentChannel.DisplayName, incidentTeam.Name, originalPostID)
	broadcastedMsg += fmt.Sprintf("By @%s | Duration: %s | Status: %s\n", author.Username, duration, theIncident.CurrentStatus())
	broadcastedMsg += "***\n"
	broadcastedMsg += statusUpdate

	if _, err := s.poster.PostMessage(theIncident.BroadcastChannelID, broadcastedMsg); err != nil {
		return err
	}

	return nil
}

// UpdateStatus updates an incident's status.
func (s *ServiceImpl) UpdateStatus(incidentID, userID string, options StatusUpdateOptions) error {
	incidentToModify, err := s.store.GetIncident(incidentID)
	if err != nil {
		return errors.Wrap(err, "failed to retrieve incident")
	}

	previousStatus := incidentToModify.CurrentStatus()

	post := model.Post{
		Message:   options.Message,
		UserId:    userID,
		ChannelId: incidentToModify.ChannelID,
	}
	if err = s.pluginAPI.Post.CreatePost(&post); err != nil {
		return errors.Wrap(err, "failed to post update status message")
	}

	// Add the status manually for the broadcasts
	incidentToModify.StatusPosts = append(incidentToModify.StatusPosts,
		StatusPost{
			ID:       post.Id,
			Status:   options.Status,
			CreateAt: post.CreateAt,
			DeleteAt: post.DeleteAt,
		})

	incidentToModify.PreviousReminder = options.Reminder
	if err = s.store.UpdateIncident(incidentToModify); err != nil {
		return errors.Wrap(err, "failed to update incident")
	}

	if err = s.store.UpdateStatus(&SQLStatusPost{
		IncidentID: incidentToModify.ID,
		PostID:     post.Id,
		Status:     options.Status,
		EndAt:      incidentToModify.ResolvedAt(),
	}); err != nil {
		return errors.Wrap(err, "failed to write status post to store. There is now inconsistent state.")
	}

	if err2 := s.broadcastStatusUpdate(options.Message, incidentToModify, userID, post.Id); err2 != nil {
		s.pluginAPI.Log.Warn("failed to broadcast the status update to channel", "ChannelID", incidentToModify.BroadcastChannelID)
	}

	// Remove pending reminder (if any), even if current reminder was set to "none" (0 minutes)
	s.RemoveReminder(incidentID)

	if options.Reminder != 0 {
		if err = s.SetReminder(incidentID, options.Reminder); err != nil {
			return errors.Wrap(err, "failed to set the reminder for incident")
		}
	}

	if err = s.removeReminderPost(incidentToModify); err != nil {
		return errors.Wrap(err, "failed to remove reminder post")
	}

	summary := ""
	if previousStatus != options.Status {
		summary = fmt.Sprintf("%s to %s", previousStatus, options.Status)
	}
	event := &TimelineEvent{
		IncidentID:    incidentID,
		CreateAt:      post.CreateAt,
		EventAt:       post.CreateAt,
		EventType:     StatusUpdated,
		Summary:       summary,
		PostID:        post.Id,
		SubjectUserID: userID,
	}

	if _, err = s.store.CreateTimelineEvent(event); err != nil {
		return errors.Wrap(err, "failed to create timeline event")
	}

	s.telemetry.UpdateStatus(incidentToModify, userID)

	if err = s.sendIncidentToClient(incidentID); err != nil {
		return err
	}

	return nil
}

// GetIncident gets an incident by ID. Returns error if it could not be found.
func (s *ServiceImpl) GetIncident(incidentID string) (*Incident, error) {
	return s.store.GetIncident(incidentID)
}

// GetIncidentMetadata gets ancillary metadata about an incident.
func (s *ServiceImpl) GetIncidentMetadata(incidentID string) (*Metadata, error) {
	incident, err := s.GetIncident(incidentID)
	if err != nil {
		return nil, errors.Wrapf(err, "failed to retrieve incident '%s'", incidentID)
	}

	// Get main channel details
	channel, err := s.pluginAPI.Channel.Get(incident.ChannelID)
	if err != nil {
		return nil, errors.Wrapf(err, "failed to retrieve channel id '%s'", incident.ChannelID)
	}
	team, err := s.pluginAPI.Team.Get(channel.TeamId)
	if err != nil {
		return nil, errors.Wrapf(err, "failed to retrieve team id '%s'", channel.TeamId)
	}

	numMembers, err := s.store.GetAllIncidentMembersCount(incident.ChannelID)
	if err != nil {
		return nil, errors.Wrapf(err, "failed to get the count of incident members for channel id '%s'", incident.ChannelID)
	}

	return &Metadata{
		ChannelName:        channel.Name,
		ChannelDisplayName: channel.DisplayName,
		TeamName:           team.Name,
		TotalPosts:         channel.TotalMsgCount,
		NumMembers:         numMembers,
	}, nil
}

// GetIncidentIDForChannel get the incidentID associated with this channel. Returns ErrNotFound
// if there is no incident associated with this channel.
func (s *ServiceImpl) GetIncidentIDForChannel(channelID string) (string, error) {
	incidentID, err := s.store.GetIncidentIDForChannel(channelID)
	if err != nil {
		return "", err
	}
	return incidentID, nil
}

// GetCommanders returns all the commanders of the incidents selected by options
func (s *ServiceImpl) GetCommanders(requesterInfo RequesterInfo, options FilterOptions) ([]CommanderInfo, error) {
	return s.store.GetCommanders(requesterInfo, options)
}

// IsCommander returns true if the userID is the commander for incidentID.
func (s *ServiceImpl) IsCommander(incidentID, userID string) bool {
	incdnt, err := s.store.GetIncident(incidentID)
	if err != nil {
		return false
	}
	return incdnt.CommanderUserID == userID
}

// ChangeCommander processes a request from userID to change the commander for incidentID
// to commanderID. Changing to the same commanderID is a no-op.
func (s *ServiceImpl) ChangeCommander(incidentID, userID, commanderID string) error {
	incidentToModify, err := s.store.GetIncident(incidentID)
	if err != nil {
		return err
	}

	if incidentToModify.CommanderUserID == commanderID {
		return nil
	}

	oldCommander, err := s.pluginAPI.User.Get(incidentToModify.CommanderUserID)
	if err != nil {
		return errors.Wrapf(err, "failed to to resolve user %s", incidentToModify.CommanderUserID)
	}
	newCommander, err := s.pluginAPI.User.Get(commanderID)
	if err != nil {
		return errors.Wrapf(err, "failed to to resolve user %s", commanderID)
	}

	incidentToModify.CommanderUserID = commanderID
	if err = s.store.UpdateIncident(incidentToModify); err != nil {
		return errors.Wrapf(err, "failed to update incident")
	}

	mainChannelID := incidentToModify.ChannelID
	modifyMessage := fmt.Sprintf("changed the incident commander from **@%s** to **@%s**.",
		oldCommander.Username, newCommander.Username)
	post, err := s.modificationMessage(userID, mainChannelID, modifyMessage)
	if err != nil {
		return err
	}

	event := &TimelineEvent{
		IncidentID:    incidentID,
		CreateAt:      post.CreateAt,
		EventAt:       post.CreateAt,
		EventType:     CommanderChanged,
		Summary:       fmt.Sprintf("@%s to @%s", oldCommander.Username, newCommander.Username),
		PostID:        post.Id,
		SubjectUserID: userID,
	}

	if _, err = s.store.CreateTimelineEvent(event); err != nil {
		return errors.Wrap(err, "failed to create timeline event")
	}

	s.telemetry.ChangeCommander(incidentToModify, userID)

	if err = s.sendIncidentToClient(incidentID); err != nil {
		return err
	}

	return nil
}

func getPropertyListItem(incident *Incident, propertyID string) (*playbook.PropertylistItem, error) {
	for _, v := range incident.Propertylist.Items {
		if v.ID == propertyID {
			return &v, nil
		}
	}

	return nil, errors.Wrapf(nil, "failed to find property")
}

func getSelectionListItem(property *playbook.PropertylistItem, selectionID string) (*playbook.SelectionlistItem, error) {
	for _, v := range property.Selection.Items {
		if v.ID == selectionID {
			return &v, nil
		}
	}

	return nil, errors.Wrapf(nil, "failed to find property")
}

// ChangePropertySelectionValue processes a request from userID to change the property value of type selection
// with id propertyID for incidentID to selectionID.
func (s *ServiceImpl) ChangePropertySelectionValue(incidentID string, userID string, propertyID string, selectionID string) error {
	incidentToModify, err := s.store.GetIncident(incidentID)
	if err != nil {
		return err
	}

	fmt.Println("new vals %s %s", propertyID, selectionID)

	property, err := getPropertyListItem(incidentToModify, propertyID)
	if err != nil {
		return err
	}

	var propertyTitle = property.Title
	var oldValueID = property.Selection.SelectedId
	for i, v := range incidentToModify.Propertylist.Items {
		if v.ID == propertyID {
			incidentToModify.Propertylist.Items[i].Selection.SelectedId = selectionID
		}
	}

	var oldValue = ""
	if oldValueID != "" {
		oldSelection, err := getSelectionListItem(property, oldValueID)
		if err == nil {
			oldValue = oldSelection.Value
		}
	}

	var newValue = ""
	newSelection, err := getSelectionListItem(property, selectionID)
	if err == nil {
		newValue = newSelection.Value
	}

	if err = s.store.UpdateIncident(incidentToModify); err != nil {
		return errors.Wrapf(err, "failed to update incident")
	}

	mainChannelID := incidentToModify.ChannelID
	modifyMessage := fmt.Sprintf("changed the incident property '**%s**' from **%s** to **%s**.",
		propertyTitle, oldValue, newValue)
	post, err := s.modificationMessage(userID, mainChannelID, modifyMessage)
	if err != nil {
		return err
	}

	event := &TimelineEvent{
		IncidentID:    incidentID,
		CreateAt:      post.CreateAt,
		EventAt:       post.CreateAt,
		EventType:     PropertyValueChanged,
		Summary:       fmt.Sprintf("@%s to @%s", oldValue, newValue),
		PostID:        post.Id,
		SubjectUserID: userID,
	}

	if _, err = s.store.CreateTimelineEvent(event); err != nil {
		return errors.Wrap(err, "failed to create timeline event")
	}

	s.telemetry.PropertyValueChanged(incidentToModify, userID)

	if err = s.sendIncidentToClient(incidentID); err != nil {
		return err
	}

	return nil
}

// ChangePropertyFreetextValue processes a request from userID to change the property value of type freetext
// with id propertyID for incidentID to freetextValue.
func (s *ServiceImpl) ChangePropertyFreetextValue(incidentID string, userID string, propertyID string, freetextValue string) error {
	incidentToModify, err := s.store.GetIncident(incidentID)
	if err != nil {
		return err
	}

	property, err := getPropertyListItem(incidentToModify, propertyID)
	if err != nil {
		return err
	}

	var propertyTitle = property.Title
	var oldValue = property.Treetext.Value
	var newValue = freetextValue

	for i, v := range incidentToModify.Propertylist.Items {
		if v.ID == propertyID {
			incidentToModify.Propertylist.Items[i].Treetext.Value = freetextValue
		}
	}

	if err = s.store.UpdateIncident(incidentToModify); err != nil {
		return errors.Wrapf(err, "failed to update incident")
	}

	mainChannelID := incidentToModify.ChannelID
	modifyMessage := fmt.Sprintf("changed the incident property '**@%s**' from **@%s** to **@%s**.",
		propertyTitle, oldValue, newValue)
	post, err := s.modificationMessage(userID, mainChannelID, modifyMessage)
	if err != nil {
		return err
	}

	event := &TimelineEvent{
		IncidentID:    incidentID,
		CreateAt:      post.CreateAt,
		EventAt:       post.CreateAt,
		EventType:     PropertyValueChanged,
		Summary:       fmt.Sprintf("@%s to @%s", oldValue, newValue),
		PostID:        post.Id,
		SubjectUserID: userID,
	}

	if _, err = s.store.CreateTimelineEvent(event); err != nil {
		return errors.Wrap(err, "failed to create timeline event")
	}

	s.telemetry.PropertyValueChanged(incidentToModify, userID)

	if err = s.sendIncidentToClient(incidentID); err != nil {
		return err
	}

	return nil
}

// ModifyCheckedState checks or unchecks the specified checklist item. Idempotent, will not perform
// any action if the checklist item is already in the given checked state
func (s *ServiceImpl) ModifyCheckedState(incidentID, userID, newState string, checklistNumber, itemNumber int) error {
	incidentToModify, err := s.checklistItemParamsVerify(incidentID, userID, checklistNumber, itemNumber)
	if err != nil {
		return err
	}

	if !playbook.IsValidChecklistItemIndex(incidentToModify.Checklists, checklistNumber, itemNumber) {
		return errors.New("invalid checklist item indicies")
	}

	itemToCheck := incidentToModify.Checklists[checklistNumber].Items[itemNumber]
	if newState == itemToCheck.State {
		return nil
	}

	// Send modification message before the actual modification because we need the postID
	// from the notification message.
	s.telemetry.ModifyCheckedState(incidentID, userID, newState, incidentToModify.CommanderUserID == userID, itemToCheck.AssigneeID == userID)

	mainChannelID := incidentToModify.ChannelID
	modifyMessage := fmt.Sprintf("checked off checklist item **%v**", stripmd.Strip(itemToCheck.Title))
	if newState == playbook.ChecklistItemStateOpen {
		modifyMessage = fmt.Sprintf("unchecked checklist item **%v**", stripmd.Strip(itemToCheck.Title))
	}
	post, err := s.modificationMessage(userID, mainChannelID, modifyMessage)
	if err != nil {
		return err
	}

	itemToCheck.State = newState
	itemToCheck.StateModified = model.GetMillis()
	itemToCheck.StateModifiedPostID = post.Id
	incidentToModify.Checklists[checklistNumber].Items[itemNumber] = itemToCheck

	if err = s.store.UpdateIncident(incidentToModify); err != nil {
		return errors.Wrapf(err, "failed to update incident, is now in inconsistent state")
	}

	event := &TimelineEvent{
		IncidentID:    incidentID,
		CreateAt:      itemToCheck.StateModified,
		EventAt:       itemToCheck.StateModified,
		EventType:     TaskStateModified,
		Summary:       modifyMessage,
		PostID:        post.Id,
		SubjectUserID: userID,
	}

	if _, err = s.store.CreateTimelineEvent(event); err != nil {
		return errors.Wrap(err, "failed to create timeline event")
	}

	if err = s.sendIncidentToClient(incidentID); err != nil {
		return err
	}

	return nil
}

// ToggleCheckedState checks or unchecks the specified checklist item
func (s *ServiceImpl) ToggleCheckedState(incidentID, userID string, checklistNumber, itemNumber int) error {
	incidentToModify, err := s.checklistItemParamsVerify(incidentID, userID, checklistNumber, itemNumber)
	if err != nil {
		return err
	}

	if !playbook.IsValidChecklistItemIndex(incidentToModify.Checklists, checklistNumber, itemNumber) {
		return errors.New("invalid checklist item indices")
	}

	isOpen := incidentToModify.Checklists[checklistNumber].Items[itemNumber].State == playbook.ChecklistItemStateOpen
	newState := playbook.ChecklistItemStateOpen
	if isOpen {
		newState = playbook.ChecklistItemStateClosed
	}

	return s.ModifyCheckedState(incidentID, userID, newState, checklistNumber, itemNumber)
}

// SetAssignee sets the assignee for the specified checklist item
// Idempotent, will not perform any actions if the checklist item is already assigned to assigneeID
func (s *ServiceImpl) SetAssignee(incidentID, userID, assigneeID string, checklistNumber, itemNumber int) error {
	incidentToModify, err := s.checklistItemParamsVerify(incidentID, userID, checklistNumber, itemNumber)
	if err != nil {
		return err
	}

	if !playbook.IsValidChecklistItemIndex(incidentToModify.Checklists, checklistNumber, itemNumber) {
		return errors.New("invalid checklist item indices")
	}

	itemToCheck := incidentToModify.Checklists[checklistNumber].Items[itemNumber]
	if assigneeID == itemToCheck.AssigneeID {
		return nil
	}

	newAssigneeUsername := noAssigneeName
	if assigneeID != "" {
		newUser, err2 := s.pluginAPI.User.Get(assigneeID)
		if err2 != nil {
			return errors.Wrapf(err, "failed to to resolve user %s", assigneeID)
		}
		newAssigneeUsername = "@" + newUser.Username
	}

	oldAssigneeUsername := noAssigneeName
	if itemToCheck.AssigneeID != "" {
		oldUser, err2 := s.pluginAPI.User.Get(itemToCheck.AssigneeID)
		if err2 != nil {
			return errors.Wrapf(err, "failed to to resolve user %s", assigneeID)
		}
		oldAssigneeUsername = oldUser.Username
	}

	mainChannelID := incidentToModify.ChannelID
	modifyMessage := fmt.Sprintf("changed assignee of checklist item **%s** from **%s** to **%s**",
		stripmd.Strip(itemToCheck.Title), oldAssigneeUsername, newAssigneeUsername)

	// Send modification message before the actual modification because we need the postID
	// from the notification message.
	post, err := s.modificationMessage(userID, mainChannelID, modifyMessage)
	if err != nil {
		return err
	}

	itemToCheck.AssigneeID = assigneeID
	itemToCheck.AssigneeModified = model.GetMillis()
	itemToCheck.AssigneeModifiedPostID = post.Id
	incidentToModify.Checklists[checklistNumber].Items[itemNumber] = itemToCheck

	if err = s.store.UpdateIncident(incidentToModify); err != nil {
		return errors.Wrapf(err, "failed to update incident; it is now in an inconsistent state")
	}

	event := &TimelineEvent{
		IncidentID:    incidentID,
		CreateAt:      itemToCheck.AssigneeModified,
		EventAt:       itemToCheck.AssigneeModified,
		EventType:     AssigneeChanged,
		Summary:       modifyMessage,
		PostID:        post.Id,
		SubjectUserID: userID,
	}

	if _, err = s.store.CreateTimelineEvent(event); err != nil {
		return errors.Wrap(err, "failed to create timeline event")
	}

	s.telemetry.SetAssignee(incidentID, userID)

	if err = s.sendIncidentToClient(incidentID); err != nil {
		return err
	}

	return nil
}

// RunChecklistItemSlashCommand executes the slash command associated with the specified checklist
// item.
func (s *ServiceImpl) RunChecklistItemSlashCommand(incidentID, userID string, checklistNumber, itemNumber int) (string, error) {
	incident, err := s.checklistItemParamsVerify(incidentID, userID, checklistNumber, itemNumber)
	if err != nil {
		return "", err
	}

	if !playbook.IsValidChecklistItemIndex(incident.Checklists, checklistNumber, itemNumber) {
		return "", errors.New("invalid checklist item indices")
	}

	itemToRun := incident.Checklists[checklistNumber].Items[itemNumber]
	if strings.TrimSpace(itemToRun.Command) == "" {
		return "", errors.New("no slash command associated with this checklist item")
	}

	cmdResponse, err := s.pluginAPI.SlashCommand.Execute(&model.CommandArgs{
		Command:   itemToRun.Command,
		UserId:    userID,
		TeamId:    incident.TeamID,
		ChannelId: incident.ChannelID,
	})
	if err == pluginapi.ErrNotFound {
		trigger := strings.Fields(itemToRun.Command)[0]
		s.poster.EphemeralPost(userID, incident.ChannelID, &model.Post{Message: fmt.Sprintf("Failed to find slash command **%s**", trigger)})

		return "", errors.Wrap(err, "failed to find slash command")
	} else if err != nil {
		s.poster.EphemeralPost(userID, incident.ChannelID, &model.Post{Message: fmt.Sprintf("Failed to execute slash command **%s**", itemToRun.Command)})

		return "", errors.Wrap(err, "failed to run slash command")
	}

	// Record the last (successful) run time.
	incident.Checklists[checklistNumber].Items[itemNumber].CommandLastRun = model.GetMillis()
	if err = s.store.UpdateIncident(incident); err != nil {
		return "", errors.Wrapf(err, "failed to update incident recording run of slash command")
	}

	eventTime := model.GetMillis()
	event := &TimelineEvent{
		IncidentID:    incidentID,
		CreateAt:      eventTime,
		EventAt:       eventTime,
		EventType:     RanSlashCommand,
		Summary:       fmt.Sprintf("ran the slash command: `%s`", itemToRun.Command),
		SubjectUserID: userID,
	}

	if _, err = s.store.CreateTimelineEvent(event); err != nil {
		return "", errors.Wrap(err, "failed to create timeline event")
	}

	s.telemetry.RunTaskSlashCommand(incidentID, userID)

	if err = s.sendIncidentToClient(incidentID); err != nil {
		return "", err
	}

	return cmdResponse.TriggerId, nil
}

// AddChecklistItem adds an item to the specified checklist
func (s *ServiceImpl) AddPropertylistItem(incidentID, userID string, propertylistItem playbook.PropertylistItem) error {
	incidentToModify, err := s.propertylistParamsVerify(incidentID, userID)
	if err != nil {
		return err
	}

	incidentToModify.Propertylist.Items = append(incidentToModify.Propertylist.Items, propertylistItem)

	if err = s.store.UpdateIncident(incidentToModify); err != nil {
		return errors.Wrapf(err, "failed to update incident")
	}

	s.poster.PublishWebsocketEventToChannel(incidentUpdatedWSEvent, incidentToModify, incidentToModify.ChannelID)
	s.telemetry.AddTask(incidentID, userID)

	return nil
}

// RemovePropertylistItem removes the item at the given index from the given checklist
func (s *ServiceImpl) RemovePropertylistItem(incidentID, userID string, itemNumber int) error {
	incidentToModify, err := s.propertyItemParamsVerify(incidentID, userID, itemNumber)
	if err != nil {
		return err
	}

	incidentToModify.Propertylist.Items = append(
		incidentToModify.Propertylist.Items[:itemNumber],
		incidentToModify.Propertylist.Items[itemNumber+1:]...,
	)

	if err = s.store.UpdateIncident(incidentToModify); err != nil {
		return errors.Wrapf(err, "failed to update incident")
	}

	s.poster.PublishWebsocketEventToChannel(incidentUpdatedWSEvent, incidentToModify, incidentToModify.ChannelID)
	s.telemetry.RemoveTask(incidentID, userID)

	return nil
}

// AddChecklistItem adds an item to the specified checklist
func (s *ServiceImpl) AddChecklistItem(incidentID, userID string, checklistNumber int, checklistItem playbook.ChecklistItem) error {
	incidentToModify, err := s.checklistParamsVerify(incidentID, userID, checklistNumber)
	if err != nil {
		return err
	}

	incidentToModify.Checklists[checklistNumber].Items = append(incidentToModify.Checklists[checklistNumber].Items, checklistItem)

	if err = s.store.UpdateIncident(incidentToModify); err != nil {
		return errors.Wrapf(err, "failed to update incident")
	}

	s.poster.PublishWebsocketEventToChannel(incidentUpdatedWSEvent, incidentToModify, incidentToModify.ChannelID)
	s.telemetry.AddTask(incidentID, userID)

	return nil
}

// RemoveChecklistItem removes the item at the given index from the given checklist
func (s *ServiceImpl) RemoveChecklistItem(incidentID, userID string, checklistNumber, itemNumber int) error {
	incidentToModify, err := s.checklistItemParamsVerify(incidentID, userID, checklistNumber, itemNumber)
	if err != nil {
		return err
	}

	incidentToModify.Checklists[checklistNumber].Items = append(
		incidentToModify.Checklists[checklistNumber].Items[:itemNumber],
		incidentToModify.Checklists[checklistNumber].Items[itemNumber+1:]...,
	)

	if err = s.store.UpdateIncident(incidentToModify); err != nil {
		return errors.Wrapf(err, "failed to update incident")
	}

	s.poster.PublishWebsocketEventToChannel(incidentUpdatedWSEvent, incidentToModify, incidentToModify.ChannelID)
	s.telemetry.RemoveTask(incidentID, userID)

	return nil
}

// UpdatePropertylistItem changes the title of a specified checklist item
func (s *ServiceImpl) UpdatePropertylistItem(incidentID, userID string, itemNumber int, newPropertylistItem playbook.PropertylistItem) error {
	incidentToModify, err := s.propertyItemParamsVerify(incidentID, userID, itemNumber)
	if err != nil {
		return err
	}

	incidentToModify.Propertylist.Items[itemNumber] = newPropertylistItem

	if err = s.store.UpdateIncident(incidentToModify); err != nil {
		return errors.Wrapf(err, "failed to update incident")
	}

	s.poster.PublishWebsocketEventToChannel(incidentUpdatedWSEvent, incidentToModify, incidentToModify.ChannelID)
	s.telemetry.RenameTask(incidentID, userID)

	return nil
}

// RenameChecklistItem changes the title of a specified checklist item
func (s *ServiceImpl) RenameChecklistItem(incidentID, userID string, checklistNumber, itemNumber int, newTitle, newCommand string) error {
	incidentToModify, err := s.checklistItemParamsVerify(incidentID, userID, checklistNumber, itemNumber)
	if err != nil {
		return err
	}

	incidentToModify.Checklists[checklistNumber].Items[itemNumber].Title = newTitle
	incidentToModify.Checklists[checklistNumber].Items[itemNumber].Command = newCommand

	if err = s.store.UpdateIncident(incidentToModify); err != nil {
		return errors.Wrapf(err, "failed to update incident")
	}

	s.poster.PublishWebsocketEventToChannel(incidentUpdatedWSEvent, incidentToModify, incidentToModify.ChannelID)
	s.telemetry.RenameTask(incidentID, userID)

	return nil
}

// MoveChecklistItem moves a checklist item to a new location
func (s *ServiceImpl) MoveChecklistItem(incidentID, userID string, checklistNumber, itemNumber, newLocation int) error {
	incidentToModify, err := s.checklistItemParamsVerify(incidentID, userID, checklistNumber, itemNumber)
	if err != nil {
		return err
	}

	if newLocation >= len(incidentToModify.Checklists[checklistNumber].Items) {
		return errors.New("invalid targetNumber")
	}

	// Move item
	checklist := incidentToModify.Checklists[checklistNumber].Items
	itemMoved := checklist[itemNumber]
	// Delete item to move
	checklist = append(checklist[:itemNumber], checklist[itemNumber+1:]...)
	// Insert item in new location
	checklist = append(checklist, playbook.ChecklistItem{})
	copy(checklist[newLocation+1:], checklist[newLocation:])
	checklist[newLocation] = itemMoved
	incidentToModify.Checklists[checklistNumber].Items = checklist

	if err = s.store.UpdateIncident(incidentToModify); err != nil {
		return errors.Wrapf(err, "failed to update incident")
	}

	s.poster.PublishWebsocketEventToChannel(incidentUpdatedWSEvent, incidentToModify, incidentToModify.ChannelID)
	s.telemetry.MoveTask(incidentID, userID)

	return nil
}

// MovePropertylistItem moves a propertylist item to a new location
func (s *ServiceImpl) MovePropertylistItem(incidentID, userID string, itemNumber, newLocation int) error {
	incidentToModify, err := s.propertyItemParamsVerify(incidentID, userID, itemNumber)
	if err != nil {
		return err
	}

	// Move item
	propertylist := incidentToModify.Propertylist.Items
	itemMoved := propertylist[itemNumber]
	// Delete item to move
	propertylist = append(propertylist[:itemNumber], propertylist[itemNumber+1:]...)
	// Insert item in new location
	propertylist = append(propertylist, playbook.PropertylistItem{})
	copy(propertylist[newLocation+1:], propertylist[newLocation:])
	propertylist[newLocation] = itemMoved
	incidentToModify.Propertylist.Items = propertylist

	if err = s.store.UpdateIncident(incidentToModify); err != nil {
		return errors.Wrapf(err, "failed to update incident")
	}

	s.poster.PublishWebsocketEventToChannel(incidentUpdatedWSEvent, incidentToModify, incidentToModify.ChannelID)
	s.telemetry.MoveTask(incidentID, userID)

	return nil
}

// GetChecklistAutocomplete returns the list of checklist items for incidentID to be used in autocomplete
func (s *ServiceImpl) GetChecklistAutocomplete(incidentID string) ([]model.AutocompleteListItem, error) {
	theIncident, err := s.store.GetIncident(incidentID)
	if err != nil {
		return nil, errors.Wrapf(err, "failed to retrieve incident")
	}

	ret := make([]model.AutocompleteListItem, 0)

	for i, checklist := range theIncident.Checklists {
		for j, item := range checklist.Items {
			ret = append(ret, model.AutocompleteListItem{
				Item:     fmt.Sprintf("%d %d", i, j),
				Hint:     fmt.Sprintf("\"%s\"", stripmd.Strip(item.Title)),
				HelpText: "Check/uncheck this item",
			})
		}
	}

	return ret, nil
}

// GetPropertylistAutocomplete returns the list of checklist items for incidentID to be used in autocomplete
func (s *ServiceImpl) GetPropertylistAutocomplete(incidentID string) ([]model.AutocompleteListItem, error) {
	theIncident, err := s.store.GetIncident(incidentID)
	if err != nil {
		return nil, errors.Wrapf(err, "failed to retrieve incident")
	}

	ret := make([]model.AutocompleteListItem, 0)

	for j, item := range theIncident.Propertylist.Items {
		ret = append(ret, model.AutocompleteListItem{
			Item:     fmt.Sprintf("%d %d", item.Title, j),
			Hint:     fmt.Sprintf("\"%s\"", stripmd.Strip(item.Title)),
			HelpText: "Check/uncheck this item",
		})
	}

	return ret, nil
}

func (s *ServiceImpl) checklistParamsVerify(incidentID, userID string, checklistNumber int) (*Incident, error) {
	incidentToModify, err := s.store.GetIncident(incidentID)
	if err != nil {
		return nil, errors.Wrapf(err, "failed to retrieve incident")
	}

	if !s.hasPermissionToModifyIncident(incidentToModify, userID) {
		return nil, errors.New("user does not have permission to modify incident")
	}

	if checklistNumber >= len(incidentToModify.Checklists) {
		return nil, errors.New("invalid checklist number")
	}

	return incidentToModify, nil
}

func (s *ServiceImpl) propertylistParamsVerify(incidentID, userID string) (*Incident, error) {
	incidentToModify, err := s.store.GetIncident(incidentID)
	if err != nil {
		return nil, errors.Wrapf(err, "failed to retrieve incident")
	}

	if !s.hasPermissionToModifyIncident(incidentToModify, userID) {
		return nil, errors.New("user does not have permission to modify incident")
	}

	return incidentToModify, nil
}

func (s *ServiceImpl) modificationMessage(userID, channelID, message string) (*model.Post, error) {
	user, err := s.pluginAPI.User.Get(userID)
	if err != nil {
		return nil, errors.Wrapf(err, "failed to to resolve user %s", userID)
	}

	post, err := s.poster.PostMessage(channelID, user.Username+" "+message)
	if err != nil {
		return nil, errors.Wrapf(err, "failed to post modification messsage")
	}

	return post, nil
}

func (s *ServiceImpl) checklistItemParamsVerify(incidentID, userID string, checklistNumber, itemNumber int) (*Incident, error) {
	incidentToModify, err := s.checklistParamsVerify(incidentID, userID, checklistNumber)
	if err != nil {
		return nil, err
	}

	if itemNumber >= len(incidentToModify.Checklists[checklistNumber].Items) {
		return nil, errors.New("invalid item number")
	}

	return incidentToModify, nil
}

func (s *ServiceImpl) propertyItemParamsVerify(incidentID, userID string, itemNumber int) (*Incident, error) {
	incidentToModify, err := s.propertylistParamsVerify(incidentID, userID)
	if err != nil {
		return nil, err
	}

	if itemNumber >= len(incidentToModify.Propertylist.Items) {
		return nil, errors.New("invalid item number")
	}

	return incidentToModify, nil
}

// NukeDB removes all incident related data.
func (s *ServiceImpl) NukeDB() error {
	return s.store.NukeDB()
}

// ChangeCreationDate changes the creation date of the incident.
func (s *ServiceImpl) ChangeCreationDate(incidentID string, creationTimestamp time.Time) error {
	return s.store.ChangeCreationDate(incidentID, creationTimestamp)
}

func (s *ServiceImpl) hasPermissionToModifyIncident(incident *Incident, userID string) bool {
	// Incident main channel membership is required to modify incident
	return s.pluginAPI.User.HasPermissionToChannel(userID, incident.ChannelID, model.PERMISSION_READ_CHANNEL)
}

func (s *ServiceImpl) createIncidentChannel(incdnt *Incident, public bool) (*model.Channel, error) {
	channelHeader := "The channel was created by the Incident Collaboration plugin."

	if incdnt.Description != "" {
		channelHeader = incdnt.Description
	}

	channelType := model.CHANNEL_PRIVATE
	if public {
		channelType = model.CHANNEL_OPEN
	}

	channel := &model.Channel{
		TeamId:      incdnt.TeamID,
		Type:        channelType,
		DisplayName: incdnt.Name,
		Name:        cleanChannelName(incdnt.Name),
		Header:      channelHeader,
	}

	// Prefer the channel name the user chose. But if it already exists, add some random bits
	// and try exactly once more.
	err := s.pluginAPI.Channel.Create(channel)
	if err != nil {
		if appErr, ok := err.(*model.AppError); ok {
			// Let the user correct display name errors:
			if appErr.Id == "model.channel.is_valid.display_name.app_error" ||
				appErr.Id == "model.channel.is_valid.2_or_more.app_error" {
				return nil, ErrChannelDisplayNameInvalid
			}

			// We can fix channel Name errors:
			if appErr.Id == "store.sql_channel.save_channel.exists.app_error" {
				channel.Name = addRandomBits(channel.Name)
				err = s.pluginAPI.Channel.Create(channel)
			}
		}

		if err != nil {
			return nil, errors.Wrapf(err, "failed to create incident channel")
		}
	}

	if _, err := s.pluginAPI.Channel.AddUser(channel.Id, incdnt.CommanderUserID, s.configService.GetConfiguration().BotUserID); err != nil {
		return nil, errors.Wrapf(err, "failed to add user to channel")
	}

	if _, err := s.pluginAPI.Channel.UpdateChannelMemberRoles(channel.Id, incdnt.CommanderUserID, fmt.Sprintf("%s %s", model.CHANNEL_ADMIN_ROLE_ID, model.CHANNEL_USER_ROLE_ID)); err != nil {
		s.pluginAPI.Log.Warn("failed to promote commander to admin", "ChannelID", channel.Id, "CommanderUserID", incdnt.CommanderUserID, "err", err.Error())
	}

	return channel, nil
}

func (s *ServiceImpl) newIncidentDialog(teamID, commanderID, postID, clientID string, playbooks []playbook.Playbook, isMobileApp bool) (*model.Dialog, error) {
	team, err := s.pluginAPI.Team.Get(teamID)
	if err != nil {
		return nil, errors.Wrapf(err, "failed to fetch team")
	}

	user, err := s.pluginAPI.User.Get(commanderID)
	if err != nil {
		return nil, errors.Wrapf(err, "failed to fetch commander user")
	}

	state, err := json.Marshal(DialogState{
		PostID:   postID,
		ClientID: clientID,
	})
	if err != nil {
		return nil, errors.Wrapf(err, "failed to marshal DialogState")
	}

	var options []*model.PostActionOptions
	for _, playbook := range playbooks {
		options = append(options, &model.PostActionOptions{
			Text:  playbook.Title,
			Value: playbook.ID,
		})
	}

	siteURL := model.SERVICE_SETTINGS_DEFAULT_SITE_URL
	if s.pluginAPI.Configuration.GetConfig().ServiceSettings.SiteURL != nil {
		siteURL = *s.pluginAPI.Configuration.GetConfig().ServiceSettings.SiteURL
	}
	newPlaybookMarkdown := ""
	if siteURL != "" && !isMobileApp {
		url := fmt.Sprintf("%s/%s/%s/playbooks/new", siteURL, team.Name, s.configService.GetManifest().Id)
		newPlaybookMarkdown = fmt.Sprintf(" [Create a playbook.](%s)", url)
	}

	introText := fmt.Sprintf("**Commander:** %v\n\nPlaybooks are necessary to start an incident.%s", getUserDisplayName(user), newPlaybookMarkdown)

	var descriptionDefault string
	if postID != "" {
		postURL := fmt.Sprintf("%s/_redirect/pl/%s", siteURL, postID)

		descriptionDefault = fmt.Sprintf("[Original Post](%s)", postURL)
	}

	return &model.Dialog{
		Title:            "Incident Details",
		IntroductionText: introText,
		Elements: []model.DialogElement{
			{
				DisplayName: "Playbook",
				Name:        DialogFieldPlaybookIDKey,
				Type:        "select",
				Options:     options,
			},
			{
				DisplayName: "Incident Name",
				Name:        DialogFieldNameKey,
				Type:        "text",
				MinLength:   2,
				MaxLength:   64,
			},
			{
				DisplayName: "Incident Description",
				Name:        DialogFieldDescriptionKey,
				Type:        "textarea",
				Default:     descriptionDefault,
				MinLength:   0,
				MaxLength:   1024,
				Optional:    true,
			},
		},
		SubmitLabel:    "Start Incident",
		NotifyOnCancel: false,
		State:          string(state),
	}, nil
}

func (s *ServiceImpl) newUpdateIncidentDialog(message, broadcastChannelID, status string, reminderTimer time.Duration) (*model.Dialog, error) {
	introductionText := "Update your incident status."

	broadcastChannel, err := s.pluginAPI.Channel.Get(broadcastChannelID)
	if err == nil {
		if broadcastChannel.Type == model.CHANNEL_OPEN {
			team, err := s.pluginAPI.Team.Get(broadcastChannel.TeamId)
			if err != nil {
				return nil, err
			}

			introductionText += fmt.Sprintf(" This post will be broadcasted to [%s](/%s/channels/%s).", broadcastChannel.DisplayName, team.Name, broadcastChannel.Id)
		} else {
			introductionText += " This post will be broadcasted to a private channel."
		}

	}

	reminderOptions := []*model.PostActionOptions{
		{
			Text:  "None",
			Value: "0",
		},
		{
			Text:  "15min",
			Value: "900",
		},
		{
			Text:  "30min",
			Value: "1800",
		},
		{
			Text:  "60min",
			Value: "3600",
		},
		{
			Text:  "4hr",
			Value: "14400",
		},
		{
			Text:  "24hr",
			Value: "86400",
		},
	}

	statusOptions := []*model.PostActionOptions{
		{
			Text:  "Reported",
			Value: "Reported",
		},
		{
			Text:  "Active",
			Value: "Active",
		},
		{
			Text:  "Resolved",
			Value: "Resolved",
		},
		{
			Text:  "Archived",
			Value: "Archived",
		},
	}

	if s.configService.IsConfiguredForDevelopmentAndTesting() {
		reminderOptions = append(reminderOptions, nil)
		copy(reminderOptions[2:], reminderOptions[1:])
		reminderOptions[1] = &model.PostActionOptions{
			Text:  "10sec",
			Value: "10",
		}
	}

	return &model.Dialog{
		Title:            "Update Incident Status",
		IntroductionText: introductionText,
		Elements: []model.DialogElement{
			{
				DisplayName: "Status",
				Name:        DialogFieldStatusKey,
				Type:        "select",
				Options:     statusOptions,
				Optional:    false,
				Default:     status,
			},
			{
				DisplayName: "Message",
				Name:        DialogFieldMessageKey,
				Type:        "textarea",
				Default:     message,
			},
			{
				DisplayName: "Reminder for next update",
				Name:        DialogFieldReminderInSecondsKey,
				Type:        "select",
				Options:     reminderOptions,
				Optional:    true,
				Default:     fmt.Sprintf("%d", reminderTimer/time.Second),
			},
		},
		SubmitLabel:    "Update Status",
		NotifyOnCancel: false,
	}, nil
}

func (s *ServiceImpl) sendIncidentToClient(incidentID string) error {
	incidentToSend, err := s.store.GetIncident(incidentID)
	if err != nil {
		return errors.Wrap(err, "failed to retrieve incident")
	}

	s.poster.PublishWebsocketEventToChannel(incidentUpdatedWSEvent, incidentToSend, incidentToSend.ChannelID)

	return nil
}

func getUserDisplayName(user *model.User) string {
	if user == nil {
		return ""
	}

	if user.FirstName != "" && user.LastName != "" {
		return fmt.Sprintf("%s %s", user.FirstName, user.LastName)
	}

	return fmt.Sprintf("@%s", user.Username)
}

func cleanChannelName(channelName string) string {
	// Lower case only
	channelName = strings.ToLower(channelName)
	// Trim spaces
	channelName = strings.TrimSpace(channelName)
	// Change all dashes to whitespace, remove everything that's not a word or whitespace, all space becomes dashes
	channelName = strings.ReplaceAll(channelName, "-", " ")
	channelName = allNonSpaceNonWordRegex.ReplaceAllString(channelName, "")
	channelName = strings.ReplaceAll(channelName, " ", "-")
	// Remove all leading and trailing dashes
	channelName = strings.Trim(channelName, "-")

	return channelName
}

func addRandomBits(name string) string {
	// Fix too long names (we're adding 5 chars):
	if len(name) > 59 {
		name = name[:59]
	}
	randBits := model.NewId()
	return fmt.Sprintf("%s-%s", name, randBits[:4])
}
