// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import { BadgeStyle } from 'src/types/playbook';

import styled, {css} from 'styled-components';

interface InfoBadgeProps {
    text: string;
    compact?: boolean;
    badge_style? : BadgeStyle;
}

const Badge = styled.div<InfoBadgeProps>`
    position: relative;
    display: inline-block;
    font-size: 12px;
    border-radius: 4px;
    padding: 0 8px;
    margin: 1px;
    font-weight: 600;

    color: var(--center-channel-color-72);
    background-color: var(--center-channel-color-16);
   
    ${(props) => props.badge_style && css`
        color: ${props.badge_style.text_color};
        background-color:  ${props.badge_style.badge_color};
    `}

    top: 1px;
    height: 24px;
    line-height: 24px;

    ${(props) => props.compact && css`
        line-height: 21px;
        height: 21px;
    `}
`;

const InfoBadge = (props: InfoBadgeProps) => (
    <div>
        <Badge {...props}>
            {props.text}
        </Badge>
    </div>
);

export default InfoBadge;
