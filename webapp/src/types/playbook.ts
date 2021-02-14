// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export interface Playbook {
    id?: string;
    title: string;
    description: string;
    team_id: string;
    create_public_incident: boolean;
    checklists: Checklist[];
    propertylist: Propertylist;
    member_ids: string[];
    broadcast_channel_id: string;
    reminder_message_template: string;
    reminder_timer_default_seconds: number;
}

export interface PlaybookNoChecklist {
    id?: string;
    title: string;
    description: string;
    team_id: string;
    create_public_incident: boolean;
    num_stages: number;
    num_steps: number;
    member_ids: string[];
}

export interface FetchPlaybooksNoChecklistReturn {
    total_count: number;
    page_count: number;
    has_more: boolean;
    items: PlaybookNoChecklist[];
}

export interface FetchIncidentsParams {
    sort?: string;
    direction?: string;
}

export interface Propertylist {
    title: string;
    items: PropertylistItem[];
}
export interface Checklist {
    title: string;
    items: ChecklistItem[];
}

export enum ChecklistItemState {
    Open = '',
    InProgress = 'in_progress',
    Closed = 'closed',
}

export interface PropertylistItem {
    id?: string;
    title: string
    type: PropertyType
    is_mandatory: boolean
    selection?: SelectionOption
    freetext?: TextOption
}

export interface TextOption {
    value: string
    badge_style?: BadgeStyle
}

export interface SelectionOption {
    values: PropertySelectionValue[]
    selected_option: PropertySelectionValue;
}

export interface PropertySelectionValue {
    id?: string;
    value: string;
    badge_style?: BadgeStyle
}

export interface BadgeStyle {
    badge_color: string;
    text_color: string;
}

export enum PropertyType {
    freetext = 'Freetext',
    selection = 'Selection',
}

export interface ChecklistItem {
    title: string;
    description: string;
    state: ChecklistItemState;
    state_modified?: number;
    state_modified_post_id?: string;
    assignee_id?: string;
    assignee_modified?: number;
    assignee_modified_post_id?: string;
    command: string;
    command_last_run: number;
}

export function emptyPlaybook(): Playbook {
    return {
        title: '',
        description: '',
        team_id: '',
        create_public_incident: false,
        checklists: [emptyChecklist()],
        propertylist: emptyPropertylist(),
        member_ids: [],
        broadcast_channel_id: '',
        reminder_message_template: '',
        reminder_timer_default_seconds: 0,
    };
}

export function emptyChecklist(): Checklist {
    return {
        title: 'Default Checklist',
        items: [emptyChecklistItem()],
    };
}

export function emptyPropertylist(): Propertylist {
    return {
        title: 'Default Checklist',
        items: [emptyPropertylistItem()],
    };
}

export function emptyPropertylistItem(): PropertylistItem {
    return {
        id: '',
        title: '',
        type: PropertyType.freetext,
        is_mandatory: false
    };
}

export function emptyChecklistItem(): ChecklistItem {
    return {
        title: '',
        state: ChecklistItemState.Open,
        command: '',
        description: '',
        command_last_run: 0,
    };
}

export const newChecklistItem = (title = '', description = '', command = '', state = ChecklistItemState.Open): ChecklistItem => ({
    title,
    description,
    command,
    command_last_run: 0,
    state,
});

export const newPropertylistItem = (id = '', title = '', optional = false, type = PropertyType.freetext): PropertylistItem => ({
    id,
    title,
    is_mandatory: optional,
    type,
});

// eslint-disable-next-line
export function isPlaybook(arg: any): arg is Playbook {
    return arg &&
        typeof arg.id === 'string' &&
        typeof arg.title === 'string' &&
        typeof arg.team_id === 'string' &&
        typeof arg.create_public_incident === 'boolean' &&
        arg.checklists && Array.isArray(arg.checklists) && arg.checklists.every(isChecklist) &&
        arg.properties && Array.isArray(arg.properties) && arg.checklists.every(isPropertyItem) &&
        arg.member_ids && Array.isArray(arg.member_ids) && arg.checklists.every((id: any) => typeof id === 'string') &&
        typeof arg.broadcast_channel_id === 'string';
}

// eslint-disable-next-line
export function isChecklist(arg: any): arg is Checklist {
    return arg &&
        typeof arg.title === 'string' &&
        arg.items && Array.isArray(arg.items) && arg.items.every(isChecklistItem);
}

// eslint-disable-next-line
export function isChecklistItem(arg: any): arg is ChecklistItem {
    return arg &&
        typeof arg.title === 'string' &&
        typeof arg.state_modified === 'number' &&
        typeof arg.state_modified_post_id === 'string' &&
        typeof arg.assignee_id === 'string' &&
        typeof arg.assignee_modified === 'number' &&
        typeof arg.assignee_modified_post_id === 'string' &&
        typeof arg.state === 'string' &&
        typeof arg.command === 'string' &&
        typeof arg.command_last_run === 'number';
}

// eslint-disable-next-line
export function isPropertyItem(arg: any): arg is PropertylistItem {
    return arg &&
        typeof arg.title === 'string' &&
        typeof arg.state_modified === 'number' &&
        typeof arg.state_modified_post_id === 'string' &&
        typeof arg.assignee_id === 'string' &&
        typeof arg.assignee_modified === 'number' &&
        typeof arg.assignee_modified_post_id === 'string' &&
        typeof arg.state === 'string' &&
        typeof arg.command === 'string' &&
        typeof arg.command_last_run === 'number';
}
