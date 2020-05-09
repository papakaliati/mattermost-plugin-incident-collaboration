package telemetry

import (
	"github.com/mattermost/mattermost-plugin-incident-response/server/incident"
)

// NoopTelemetry satisfies the Telemetry interface with no-op implementations.
type NoopTelemetry struct{}

// CreateIncident does nothing
func (t *NoopTelemetry) CreateIncident(*incident.Incident) {
}

// EndIncident does nothing
func (t *NoopTelemetry) EndIncident(*incident.Incident) {
}

// AddChecklistItem does nothing.
func (t *NoopTelemetry) AddChecklistItem(string, string) {
}

// RemoveChecklistItem does nothing.
func (t *NoopTelemetry) RemoveChecklistItem(string, string) {
}

// RenameChecklistItem does nothing.
func (t *NoopTelemetry) RenameChecklistItem(string, string) {
}

// ModifyCheckedState does nothing.
func (t *NoopTelemetry) ModifyCheckedState(string, string, bool) {
}

// MoveChecklistItem does nothing.
func (t *NoopTelemetry) MoveChecklistItem(string, string) {
}
