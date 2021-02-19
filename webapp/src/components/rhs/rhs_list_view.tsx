// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Scrollbars from 'react-custom-scrollbars';
import styled from 'styled-components';

import { getCurrentTeam } from 'mattermost-redux/selectors/entities/teams';
import { GlobalState } from 'mattermost-redux/types/store';
import { Team } from 'mattermost-redux/types/teams';
import { getCurrentChannelId } from 'mattermost-redux/selectors/entities/channels';

import { pluginId } from 'src/manifest';
import RHSWelcomeView from 'src/components/rhs/rhs_welcome_view';
import PlusIcon from 'src/components/assets/icons/plus_icon';
import {
    renderThumbVertical,
    renderTrackHorizontal,
    renderView, RHSContainer, RHSContent,
} from 'src/components/rhs/rhs_shared';
import { setRHSViewingIncident, startIncident } from 'src/actions';
import { navigateToTeamPluginUrl, navigateToUrl } from 'src/browser_routing';
import { Incident } from 'src/types/incident';
import DotMenu, { DropdownMenuItem } from 'src/components/dot_menu';
import { myActiveIncidentsList } from 'src/selectors';
import { HamburgerButton } from 'src/components/assets/icons/three_dots_icon';
import RHSListIncident from 'src/components/rhs/rhs_list_incident';
import classNames from 'classnames';
import { SearchBar } from '../widgets/search-bar/search-bar';
import { PropertylistItem, PropertyType } from 'src/types/playbook';

const Header = styled.div`
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    justify-items: center;
    font-size: 12px;
    font-style: normal;
    font-weight: 600;
    line-height:47px;
    height: 47px;
    letter-spacing: 0;
    text-align: center;
    box-shadow: inset 0px -1px 0px var(--center-channel-color-24);
`;

const CenterCell = styled.div`
    grid-column-start: 2;
`;

const RightCell = styled.div`
    display: inline-flex;
    align-items: center;
    margin: 0 17px 0 auto;
`;

const Link = styled.span`
    color: var(--button-bg);
    cursor: pointer;

    >.icon {
        font-size: 14px;
    }
`;

const Footer = styled.div`
    display: block;
    font-size: 12px;
    font-style: normal;
    font-weight: 400;
    line-height:47px;
    height: 47px;
    text-align: center;
    padding-bottom: 10rem;
`;

const RHSListView = () => {
    const dispatch = useDispatch();
    const currentTeam = useSelector<GlobalState, Team>(getCurrentTeam);
    const currentChannelId = useSelector<GlobalState, string>(getCurrentChannelId);
    const incidentList = useSelector<GlobalState, Incident[]>(myActiveIncidentsList);
    const [searchResults, setSearchResults] = React.useState<Incident[]>([]);
    const [searchTerm, setSearchTerm] = React.useState("");

    const viewIncident = (channelId: string) => {
        dispatch(setRHSViewingIncident());
        navigateToUrl(`/${currentTeam.name}/channels/${channelId}`);
    };

    const viewBackstageIncidentList = () => {
        navigateToUrl(`/${currentTeam.name}/${pluginId}/incidents`);
    };

    if (incidentList.length === 0) {
        return <RHSWelcomeView />;
    }

    const selectionValueContainsSearch = (i: PropertylistItem) => {
        if (!i.selection)
            return false;
        var idx = i.selection.selected_id

        if (i.selection.is_multiselect) {
            var inds = idx.split(',')
            let isMatched = inds.some(index => {
                if (i.selection) {
                    var result = i.selection.items.filter(x => x.id == index);

                    if (result.length > 0) {
                        isContainted = result[0].value.toUpperCase().includes(searchTerm.toUpperCase())
                        if (isContainted)
                            return true;
                    }
                }
            });
            return isMatched; 
        }
        else {
            var result = i.selection.items.filter(x => x.id == idx);
            if (result.length <= 0)
                return false;
            var isContainted = result[0].value.toUpperCase().includes(searchTerm.toUpperCase())
            return isContainted;
        }

        return false;
    }

    const incidentFilter = (i: Incident) => {
        return (
            i.description.toUpperCase().includes(searchTerm.toUpperCase()) ||
            i.name.toUpperCase().includes(searchTerm.toUpperCase()) ||
            i.propertylist.items.filter(x =>
                x.type === PropertyType.Freetext &&
                x.freetext &&
                x.freetext.value.toUpperCase().includes(searchTerm.toUpperCase())
            ).length > 0 ||
            i.propertylist.items.filter(x =>
                x.type === PropertyType.Selection &&
                x.selection &&
                selectionValueContainsSearch(x)
            ).length > 0
        )
    };

    React.useEffect(() => {
        const results = incidentList.filter(i =>
            incidentFilter(i)
        );

        setSearchResults(results);
    }, [searchTerm]);

    const onSearchInputChanged = (value: string) => {
        setSearchTerm(value);
    }

    return (
        <RHSContainer>
            <RHSContent>

                <SearchBar
                    search={searchTerm}
                    setSearch={(search) => onSearchInputChanged(search)}
                />

                <Scrollbars
                    autoHide={true}
                    autoHideTimeout={500}
                    autoHideDuration={500}
                    renderThumbVertical={renderThumbVertical}
                    renderView={renderView}
                    renderTrackHorizontal={renderTrackHorizontal}
                    style={{ position: 'absolute' }}
                >
                    <Header>
                        <CenterCell>
                            <Link onClick={() => dispatch(startIncident())}>
                                <PlusIcon />{'Start Incident'}
                            </Link>
                        </CenterCell>
                        <RightCell>
                            <ThreeDotMenu
                                onCreatePlaybook={() => navigateToTeamPluginUrl(currentTeam.name, '/playbooks')}
                                onSeeAllIncidents={() => navigateToTeamPluginUrl(currentTeam.name, '/incidents')}
                            />
                        </RightCell>
                    </Header>

                    {searchResults.map((incident) => {
                        return (
                            <RHSListIncident
                                key={incident.id}
                                incident={incident}
                                active={currentChannelId === incident.channel_id}
                                viewIncident={viewIncident}
                            />
                        );
                    })}

                    <Footer>
                        {'Looking for closed incidents? '}
                        <a onClick={viewBackstageIncidentList}>{'Click here'}</a>
                        {' to see all incidents.'}
                    </Footer>
                </Scrollbars>
            </RHSContent>
        </RHSContainer>
    );
};

interface ThreeDotMenuProps {
    onCreatePlaybook: () => void;
    onSeeAllIncidents: () => void;
}

const ThreeDotMenu = (props: ThreeDotMenuProps) => (
    <DotMenu
        icon={<HamburgerButton />}
        left={true}
    >
        <DropdownMenuItem
            text='Create Playbook'
            onClick={props.onCreatePlaybook}
        />
        <DropdownMenuItem
            text='See all Incidents'
            onClick={props.onSeeAllIncidents}
        />
    </DotMenu>
);

export default RHSListView;
