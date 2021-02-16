// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, { FC } from 'react';
import Scrollbars from 'react-custom-scrollbars';

import { fetchUsersInChannel, setCommander, setPropertySelectionValue } from 'src/client';
import { Incident, incidentCurrentStatus } from 'src/types/incident';
import ProfileSelector from 'src/components/profile/profile_selector';
import Duration from '../duration';
import './incident_details.scss';
import {
    renderThumbHorizontal,
    renderThumbVertical,
    renderView,
} from 'src/components/rhs/rhs_shared';
import LatestUpdate from 'src/components/rhs/latest_update';
import PropertySelector from '../property/property_selector';
import { PropertylistItem, PropertyType } from 'src/types/playbook';
import PropertyMultiSelector from '../property/property_multiselector';

interface Props {
    incident: Incident;
}

const RHSIncidentSummary: FC<Props> = (props: Props) => {
    const fetchUsers = async () => {
        return fetchUsersInChannel(props.incident.channel_id);
    };

    const onSelectedProfileChange = async (userId?: string) => {
        if (!userId) {
            return;
        }
        const response = await setCommander(props.incident.id, userId);
        if (response.error) {
            // TODO: Should be presented to the user? https://mattermost.atlassian.net/browse/MM-24271
            console.log(response.error); // eslint-disable-line no-console
        }
    };

    const onSelectedPropertyChange = async (propertyId: string, valueId: string) => {
        const response = await setPropertySelectionValue(props.incident.id, propertyId, valueId);
        if (response.error) {
            // TODO: Should be presented to the user? https://mattermost.atlassian.net/browse/MM-24271
            console.log(response.error); // eslint-disable-line no-console
        }
    };

    const onMultiSelectedPropertyChange = async (propertyId: string, valueId: string[]) => {
        const response = await setPropertySelectionValue(props.incident.id, propertyId, valueId.join());
        if (response.error) {
            // TODO: Should be presented to the user? https://mattermost.atlassian.net/browse/MM-24271
            console.log(response.error); // eslint-disable-line no-console
        }
    };


    return (
        <Scrollbars
            autoHide={true}
            autoHideTimeout={500}
            autoHideDuration={500}
            renderThumbHorizontal={renderThumbHorizontal}
            renderThumbVertical={renderThumbVertical}
            renderView={renderView}
            style={{ position: 'absolute' }}
        >
            <div className='IncidentDetails'>
                <div className='side-by-side'>
                    <div className='inner-container first-container'>
                        <div className='first-title'>{'Commander'}</div>
                        <ProfileSelector
                            selectedUserId={props.incident.commander_user_id}
                            placeholder={'Assign Commander'}
                            placeholderButtonClass={'NoAssignee-button'}
                            profileButtonClass={'Assigned-button'}
                            enableEdit={true}
                            getUsers={fetchUsers}
                            onSelectedChange={onSelectedProfileChange}
                            selfIsFirstOption={true}
                        />
                    </div>
                    <div className='first-title'>
                        {'Duration'}
                        <Duration
                            from={props.incident.create_at}
                            to={props.incident.end_at}
                        />
                    </div>
                </div>
                <div className='side-by-side'>
                    <div className='inner-container first-container'>
                        <div className='first-title'>{'Status'}</div>
                        <div>{incidentCurrentStatus(props.incident)}</div>
                    </div>
                </div>
                <div id={'incidentRHSUpdates'}>
                    <div className='title'>
                        {'Recent Update:'}
                    </div>
                    <LatestUpdate statusPosts={props.incident.status_posts} />
                </div>

                {props.incident.propertylist && props.incident.propertylist.items && props.incident.propertylist.items.map((property) => {
                    return (
                        <div className='inner-container first-container'>
                            <div className='first-title'>{property.title}</div>

                            { property.freetext &&
                                property.type === PropertyType.Freetext &&
                                <div>{property.freetext.value}</div>
                            }

                            { property.selection &&
                                property.type === PropertyType.Selection &&
                                !property.selection.is_multiselect &&
                                <PropertySelector
                                    selectedValueId={property.selection.selected_id}
                                    property={property}
                                    placeholder={''}
                                    placeholderButtonClass={'NoAssignee-button'}
                                    enableEdit={true}
                                    onSelectedChange={onSelectedPropertyChange}
                                    selfIsFirstOption={true} />
                            }

                            { property.selection &&
                                property.type === PropertyType.Selection &&
                                property.selection.is_multiselect &&
                                <PropertyMultiSelector
                                    selectedValueId={property.selection.selected_id}
                                    property={property}
                                    onMultiSelectedChange={onMultiSelectedPropertyChange}
                                />
                            }
                        </div>
                    );
                })}

                {props.incident.links && props.incident.links.map((link) => {
                    return (
                        <div>
                            <a href={link.name}>{link.url}</a>
                        </div>
                    );
                })}
            </div>
        </Scrollbars>
    );
};

export default RHSIncidentSummary;
