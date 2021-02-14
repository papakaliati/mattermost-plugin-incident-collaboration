// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import './property_button.scss';
import PropertyItem from 'src/components/property/property';
import { PropertySelectionValue } from 'src/types/playbook';

interface Props {
    enableEdit: boolean;
    property: PropertySelectionValue;
    onClick: () => void;
}

export default function CustomPropertyButton(props: Props) {
    const downChevron = props.enableEdit ? <i className='icon-chevron-down ml-1 mr-2'/> : <></>;

    return (
        <button
            onClick={props.onClick}
            className='IncidentProfileButton'
        >
            <PropertyItem
                classNames={{active: props.enableEdit}}
                extra={downChevron}
                selectedPropertyOptionValue= {props.property}
            />
        </button>
    );
}
