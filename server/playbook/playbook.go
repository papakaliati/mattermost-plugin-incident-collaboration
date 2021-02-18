package playbook

import (
	"encoding/json"

	"github.com/pkg/errors"
)

// ErrNotFound used to indicate entity not found.
var ErrNotFound = errors.New("not found")

// Playbook represents the planning before an incident type is initiated.
type Playbook struct {
	ID                          string       `json:"id"`
	Title                       string       `json:"title"`
	Description                 string       `json:"description"`
	TeamID                      string       `json:"team_id"`
	CreatePublicIncident        bool         `json:"create_public_incident"`
	CreateAt                    int64        `json:"create_at"`
	DeleteAt                    int64        `json:"delete_at"`
	NumStages                   int64        `json:"num_stages"`
	NumSteps                    int64        `json:"num_steps"`
	Checklists                  []Checklist  `json:"checklists"`
	Propertylist                Propertylist `json:"propertylist"`
	MemberIDs                   []string     `json:"member_ids"`
	BroadcastChannelID          string       `json:"broadcast_channel_id"`
	ReminderMessageTemplate     string       `json:"reminder_message_template"`
	ReminderTimerDefaultSeconds int64        `json:"reminder_timer_default_seconds"`
}

func (p Playbook) Clone() Playbook {
	newPlaybook := p
	var newChecklists []Checklist
	for _, c := range p.Checklists {
		newChecklists = append(newChecklists, c.Clone())
	}

	var newPropertylist Propertylist
	newPropertylist = p.Propertylist.Clone()

	newPlaybook.Propertylist = newPropertylist
	newPlaybook.Checklists = newChecklists
	newPlaybook.MemberIDs = append([]string(nil), p.MemberIDs...)
	return newPlaybook
}

func (p Playbook) MarshalJSON() ([]byte, error) {
	type Alias Playbook

	old := Alias(p.Clone())
	// replace nils with empty slices for the frontend
	if old.Checklists == nil {
		old.Checklists = []Checklist{}
	}
	for j, cl := range old.Checklists {
		if cl.Items == nil {
			old.Checklists[j].Items = []ChecklistItem{}
		}
	}

	if old.Propertylist.Items == nil {
		old.Propertylist.Items = []PropertylistItem{}
	}
	if old.MemberIDs == nil {
		old.MemberIDs = []string{}
	}

	return json.Marshal(old)
}

// Propertylist represents collection of properties in a playbook
type Propertylist struct {
	ID    string             `json:"id"`
	Title string             `json:"title"`
	Items []PropertylistItem `json:"items"`
}

// Checklist represents a checklist in a playbook
type Checklist struct {
	ID    string          `json:"id"`
	Title string          `json:"title"`
	Items []ChecklistItem `json:"items"`
}

func (c Checklist) Clone() Checklist {
	newChecklist := c
	newChecklist.Items = append([]ChecklistItem(nil), c.Items...)
	return newChecklist
}

func (c Propertylist) Clone() Propertylist {
	newPropertylist := c
	return newPropertylist
}

func (c PropertylistItem) Clone() PropertylistItem {
	newPropertyItem := c
	return newPropertyItem
}

func (c TextOption) Clone() TextOption {
	newTextOption := c
	return newTextOption
}

func (c Selectionlist) Clone() Selectionlist {
	newSelectionlist := c
	return newSelectionlist
}

func (c SelectionlistItem) Clone() SelectionlistItem {
	newSelectionlistItem := c
	return newSelectionlistItem
}

// ChecklistItem represents an item in a checklist
type ChecklistItem struct {
	ID                     string `json:"id"`
	Title                  string `json:"title"`
	State                  string `json:"state"`
	StateModified          int64  `json:"state_modified"`
	StateModifiedPostID    string `json:"state_modified_post_id"`
	AssigneeID             string `json:"assignee_id"`
	AssigneeModified       int64  `json:"assignee_modified"`
	AssigneeModifiedPostID string `json:"assignee_modified_post_id"`
	Command                string `json:"command"`
	CommandLastRun         int64  `json:"command_last_run"`
	Description            string `json:"description"`
}

type GetPlaybooksResults struct {
	TotalCount int        `json:"total_count"`
	PageCount  int        `json:"page_count"`
	HasMore    bool       `json:"has_more"`
	Items      []Playbook `json:"items"`
}

// PropertylistItem represents an item in a checklist
type PropertylistItem struct {
	ID          string        `json:"id"`
	Title       string        `json:"title"`
	Type        string        `json:"type"`
	IsMandatory bool          `json:"is_mandatory"`
	Selection   Selectionlist `json:"selection"`
	Treetext    TextOption    `json:"freetext"`
}

type TextOption struct {
	Value      string     `json:"value"`
	BadgeStyle BadgeStyle `json:"badge_style"`
}

type Selectionlist struct {
	Items         []SelectionlistItem `json:"items"`
	IsMultiselect bool                `json:"is_multiselect"`
	SelectedId    string              `json:"selected_id"`
}

type SelectionlistItem struct {
	ID         string     `json:"id"`
	Value      string     `json:"value"`
	BadgeStyle BadgeStyle `json:"badge_style"`
}

type BadgeStyle struct {
	BadgeColor string `json:"badge_color"`
	TextColor  string `json:"text_color"`
}

// MarshalJSON customizes the JSON marshalling for GetPlaybooksResults by rendering a nil Items as
// an empty slice instead.
func (r GetPlaybooksResults) MarshalJSON() ([]byte, error) {
	type Alias GetPlaybooksResults

	if r.Items == nil {
		r.Items = []Playbook{}
	}

	aux := &struct {
		*Alias
	}{
		Alias: (*Alias)(&r),
	}

	return json.Marshal(aux)
}

// RequesterInfo holds the userID and permissions for the user making the request
type RequesterInfo struct {
	UserID          string
	TeamID          string
	UserIDtoIsAdmin map[string]bool

	// MemberOnly filters playbooks to those for which UserId is a member
	MemberOnly bool
}

// Service is the playbook service for managing playbooks
// userID is the user initiating the event.
type Service interface {
	// Get retrieves a playbook. Returns ErrNotFound if not found.
	Get(id string) (Playbook, error)
	// Create creates a new playbook
	Create(playbook Playbook, userID string) (string, error)
	// GetPlaybooks retrieves all playbooks
	GetPlaybooks() ([]Playbook, error)
	// GetPlaybooksForTeam retrieves all playbooks on the specified team given the provided options
	GetPlaybooksForTeam(requesterInfo RequesterInfo, teamID string, opts Options) (GetPlaybooksResults, error)
	// Update updates a playbook
	Update(playbook Playbook, userID string) error
	// Delete deletes a playbook
	Delete(playbook Playbook, userID string) error
}

// Store is an interface for storing playbooks
type Store interface {
	// Get retrieves a playbook
	Get(id string) (Playbook, error)
	// Create creates a new playbook
	Create(playbook Playbook) (string, error)
	// GetPlaybooks retrieves all playbooks
	GetPlaybooks() ([]Playbook, error)
	// GetPlaybooksForTeam retrieves all playbooks on the specified team
	GetPlaybooksForTeam(requesterInfo RequesterInfo, teamID string, opts Options) (GetPlaybooksResults, error)
	// Update updates a playbook
	Update(playbook Playbook) error
	// Delete deletes a playbook
	Delete(id string) error
}

// Telemetry defines the methods that the Playbook service needs from the RudderTelemetry.
// userID is the user initiating the event.
type Telemetry interface {
	// CreatePlaybook tracks the creation of a playbook.
	CreatePlaybook(playbook Playbook, userID string)

	// UpdatePlaybook tracks the update of a playbook.
	UpdatePlaybook(playbook Playbook, userID string)

	// DeletePlaybook tracks the deletion of a playbook.
	DeletePlaybook(playbook Playbook, userID string)
}

const (
	ChecklistItemStateOpen       = ""
	ChecklistItemStateInProgress = "in_progress"
	ChecklistItemStateClosed     = "closed"
)

func IsValidChecklistItemState(state string) bool {
	return state == ChecklistItemStateClosed ||
		state == ChecklistItemStateInProgress ||
		state == ChecklistItemStateOpen
}

func IsValidChecklistItemIndex(checklists []Checklist, checklistNum, itemNum int) bool {
	return checklists != nil && checklistNum >= 0 && itemNum >= 0 && checklistNum < len(checklists) && itemNum < len(checklists[checklistNum].Items)
}
