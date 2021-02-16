// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, { FC, useEffect } from 'react';
import classNames from 'classnames';

import './property.scss';
import InfoBadge from '../backstage/incidents/info_badge';
import { SelectionlistItem } from 'src/types/playbook';

interface Props {
    classNames?: Record<string, boolean>;
    className?: string;
    selectionValueId?: string;
    extra?: JSX.Element;
    selectedPropertyOptionValue?: SelectionlistItem;
}

const PropertyView: FC<Props> = (props: Props) => {
    return (
        <div className={classNames('IncidentProfile', props.classNames, props.className)}>
            {props.selectedPropertyOptionValue &&
                <InfoBadge
                    text={props.selectedPropertyOptionValue.value}
                    badge_style={props.selectedPropertyOptionValue.badge_style}
                    compact={true} />
            }
            {props.extra}
        </div>
    );
};

export default PropertyView;
