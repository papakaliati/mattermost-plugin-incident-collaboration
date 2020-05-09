package api

import (
	"encoding/json"
	"fmt"
	"net/http"

	pluginapi "github.com/mattermost/mattermost-plugin-api"

	"github.com/gorilla/mux"
	"github.com/mattermost/mattermost-server/v5/model"
	"github.com/pkg/errors"

	"github.com/mattermost/mattermost-plugin-incident-response/server/playbook"
)

// PlaybookHandler is the API handler.
type PlaybookHandler struct {
	playbookService playbook.Service
	pluginAPI       *pluginapi.Client
}

// NewPlaybookHandler returns a new playbook api handler
func NewPlaybookHandler(router *mux.Router, playbookService playbook.Service, api *pluginapi.Client) *PlaybookHandler {
	handler := &PlaybookHandler{
		playbookService: playbookService,
		pluginAPI:       api,
	}

	playbooksRouter := router.PathPrefix("/playbooks").Subrouter()
	playbooksRouter.HandleFunc("", handler.createPlaybook).Methods(http.MethodPost)
	playbooksRouter.HandleFunc("", handler.getPlaybooks).Methods(http.MethodGet)

	playbookRouter := playbooksRouter.PathPrefix("/{id:[A-Za-z0-9]+}").Subrouter()
	playbookRouter.HandleFunc("", handler.getPlaybook).Methods(http.MethodGet)
	playbookRouter.HandleFunc("", handler.updatePlaybook).Methods(http.MethodPut)
	playbookRouter.HandleFunc("", handler.deletePlaybook).Methods(http.MethodDelete)

	return handler
}

func (h *PlaybookHandler) createPlaybook(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("Mattermost-User-ID")

	var newPlaybook playbook.Playbook
	if err := json.NewDecoder(r.Body).Decode(&newPlaybook); err != nil {
		HandleError(w, fmt.Errorf("unable to decode playbook: %w", err))
		return
	}

	if newPlaybook.ID != "" {
		HandleErrorWithCode(w, http.StatusBadRequest, "Playbook given already has ID", nil)
		return
	}

	if !h.pluginAPI.User.HasPermissionToTeam(userID, newPlaybook.TeamID, model.PERMISSION_VIEW_TEAM) {
		HandleErrorWithCode(w, http.StatusForbidden, "Not authorized", fmt.Errorf(
			"userID %s does not have permission to create playbook on teamID %s",
			userID,
			newPlaybook.TeamID,
		))
		return
	}

	id, err := h.playbookService.Create(newPlaybook)
	if err != nil {
		HandleError(w, err)
		return
	}

	result := struct {
		ID string `json:"id"`
	}{
		ID: id,
	}
	ReturnJSON(w, &result)
}

func (h *PlaybookHandler) getPlaybook(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	userID := r.Header.Get("Mattermost-User-ID")

	foundPlaybook, err := h.playbookService.Get(vars["id"])
	if err != nil {
		HandleError(w, err)
		return
	}

	if !h.pluginAPI.User.HasPermissionToTeam(userID, foundPlaybook.TeamID, model.PERMISSION_VIEW_TEAM) {
		HandleErrorWithCode(w, http.StatusForbidden, "Not authorized", fmt.Errorf(
			"userID %s does not have permission to get playbook on teamID %s",
			userID,
			foundPlaybook.TeamID,
		))
		return
	}

	ReturnJSON(w, &foundPlaybook)
}

func (h *PlaybookHandler) updatePlaybook(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	userID := r.Header.Get("Mattermost-User-ID")
	var updatedPlaybook playbook.Playbook
	if err := json.NewDecoder(r.Body).Decode(&updatedPlaybook); err != nil {
		HandleError(w, errors.Wrap(err, "unable to decode playbook"))
		return
	}

	// Force parsed playbook id to be URL parameter id
	updatedPlaybook.ID = vars["id"]

	oldPlaybook, err := h.playbookService.Get(vars["id"])
	if err != nil {
		HandleError(w, err)
		return
	}

	if !h.pluginAPI.User.HasPermissionToTeam(userID, oldPlaybook.TeamID, model.PERMISSION_VIEW_TEAM) {
		HandleErrorWithCode(w, http.StatusForbidden, "Not authorized", fmt.Errorf(
			"userID %s does not have permission to update playbook on teamID %s",
			userID,
			oldPlaybook.TeamID,
		))
		return
	}

	if err := h.playbookService.Update(updatedPlaybook); err != nil {
		HandleError(w, err)
		return
	}

	HandleOK(w)
}

func (h *PlaybookHandler) deletePlaybook(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	userID := r.Header.Get("Mattermost-User-ID")

	playbookToDelete, err := h.playbookService.Get(vars["id"])
	if err != nil {
		HandleError(w, err)
		return
	}

	if !h.pluginAPI.User.HasPermissionToTeam(userID, playbookToDelete.TeamID, model.PERMISSION_VIEW_TEAM) {
		HandleErrorWithCode(w, http.StatusForbidden, "Not authorized", fmt.Errorf(
			"userID %s does not have permission to delete a playbook on teamID %s",
			userID,
			playbookToDelete.TeamID,
		))
		return
	}

	if err := h.playbookService.Delete(playbookToDelete); err != nil {
		HandleError(w, err)
		return
	}

	HandleOK(w)
}

func (h *PlaybookHandler) getPlaybooks(w http.ResponseWriter, r *http.Request) {
	params := r.URL.Query()
	teamID := params.Get("teamid")
	userID := r.Header.Get("Mattermost-User-ID")

	if teamID == "" {
		HandleErrorWithCode(w, http.StatusBadRequest, "Provide a team ID", nil)
		return
	}

	if !h.pluginAPI.User.HasPermissionToTeam(userID, teamID, model.PERMISSION_VIEW_TEAM) {
		HandleErrorWithCode(w, http.StatusForbidden, "Not authorized", fmt.Errorf(
			"userID %s does not have permission to get playbooks on teamID %s",
			userID,
			teamID,
		))
		return
	}

	playbooks, err := h.playbookService.GetPlaybooksForTeam(teamID)
	if err != nil {
		HandleError(w, err)
		return
	}

	ReturnJSON(w, &playbooks)
}
