// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/*
example: 
{
    name: "region",
    type: "selection",
    optional: false,
    value: ''// only used when type: freetext
    selected_option: 1,
    display_style: "Badge"
    options: {
        values: {
            id: 1
            value: AMAP
        }
        values: {
            id: 2
            value: EMEA
        }
        values: {
            id: 3
            value: AMAP
        }
    }  
}
*/

export interface PropertylistItem { 
    id?: string;
    title: string
    type: PropertyType
    optional: boolean
    selection?: SelectionOption
    freetext?: FreetextOption
}

export interface FreetextOption {
    value: string
    badge_style?: BadgeStyle
}

export interface SelectionOption {
    values: CustomPropertyOptionValue[]
    selected_option: CustomPropertyOptionValue;
}

export interface CustomPropertyOptionValue{
    id?: string;
    value: string;
    badge_style?: BadgeStyle
}

export interface BadgeStyle{
    badge_color: string;
    text_color: string;
}

export enum PropertyType {
    freetext = 'Freetext',
    selection = 'Selection',
}

export enum FreetextType {
    freetext = 'Freetext',
    label = 'Label',
}

export enum DisplayStyle {
    text = 'Text',
    badge = 'Badge',
}