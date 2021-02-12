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
    options: {
        display_style: "Badge"
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

export interface CustomProperty { 
    name: string;
    type: CustomPropertyType;
    optional: boolean;
    value: string;
    option: CustomPropertyOption;
}

export interface CustomPropertyOption {
    values: CustomPropertyOptionValue[]
    selected_option: CustomPropertyOptionValue;
    display_style: DisplayStyle
}

export interface CustomPropertyOptionValue{
    id?: string;
    value: string;
    badge_style: BadgeStyle
}

export interface BadgeStyle{
    badge_color: string;
    text_color: string;
}

export enum CustomPropertyType {
    freetext = 'freetext',
    selection = 'selection',
}

export enum DisplayStyle {
    text = 'Text',
    badge = 'Badge',
}