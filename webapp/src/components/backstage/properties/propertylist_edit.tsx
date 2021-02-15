// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import styled from 'styled-components';

import { newPropertylistItem, Propertylist, PropertylistItem, PropertyType } from 'src/types/playbook';

import { TertiaryButton } from 'src/components/assets/buttons';

import PropertyEdit from './property_edit';

interface Props {
    propertylist: Propertylist;
    propertylistIndex: number;
    onChange: (propertylist: Propertylist) => void;
}

export const PropertyListEditor = (props: Props): React.ReactElement => {

    const onAddPropertylistItem = (item: PropertylistItem) => {
        const newPropertylist = {
            ...props.propertylist,
            items: [...props.propertylist.items, item],
        } as Propertylist;
        props.onChange(newPropertylist);
    };

    const onChangePropertylistItem = (propertylistItemIndex: number, item: PropertylistItem) => {
        const newPropertylist = {
            ...props.propertylist,
            items: [...props.propertylist.items],
        } as Propertylist;
        newPropertylist.items[propertylistItemIndex] = item;
        props.onChange(newPropertylist);
    };

    const handleAddPropertylistItem = () => {
        onAddPropertylistItem(newPropertylistItem('New Property', '', false, PropertyType.freetext));
    };

    return (
        <>
            <div>
                {props.propertylist.items.map((propertyItem: PropertylistItem, idx: number) => (

                    <PropertyEdit
                        key={propertyItem.title}
                        autocompleteOnBottom={props.propertylistIndex === 0 && idx === 0}
                        property={propertyItem}
                        onUpdate={(updatedStep: PropertylistItem) => {
                            onChangePropertylistItem(idx, updatedStep);
                        }}
                    />
                ))}
            </div>
            <TertiaryButton
                className='mt-3'
                onClick={handleAddPropertylistItem}
            >
                <i className='icon-plus' />
                {'New Property'}
            </TertiaryButton>
        </>
    );
};
