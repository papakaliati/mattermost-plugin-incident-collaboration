// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, { useState } from 'react';
import styled from 'styled-components';


import { TertiaryButton } from 'src/components/assets/buttons';

import { newSelectionlistItem, Selectionlist, SelectionlistItem } from 'src/types/playbook';
import { TitleItem } from './property_edit';


interface Props {
    selectionlist: Selectionlist;
    selectionlistIndex: number;
    setSelectionlist: (selectionlist: Selectionlist) => void;
}

export const PropertySelectionlistEditor = (props: Props): React.ReactElement => {

    const onAddSelectionlistItem = (item: SelectionlistItem) => {
        const newSelectionlist = {
            ...props.selectionlist,
            items: [...props.selectionlist.items, item],
        } as Selectionlist;
        props.setSelectionlist(newSelectionlist);
    };

    const handleAddSelectionlistItem = () => {
        const idx = props.selectionlist.items.length + 1;
        onAddSelectionlistItem(newSelectionlistItem(idx.toString(), ''));
    }; 

    const onChangeSelectionItem = (selectionItemIndex: number, value: string) => {
        const newSelectionlist = {
            ...props.selectionlist,
            items: [...props.selectionlist.items],
        } as Selectionlist;
        newSelectionlist.items[selectionItemIndex].value = value;
        props.setSelectionlist(newSelectionlist);
    };

    return (
        <>
            <div>
                {props.selectionlist.items.map((item: SelectionlistItem, idx: number) => (
                    <TitleItem
                        title={item.value}
                        setTitle={(value) => onChangeSelectionItem(idx, value )}
                    />
                ))}
            </div>
            <TertiaryButton
                className='mt-3'
                onClick={handleAddSelectionlistItem}
            >
                <i className='icon-plus' />
                {'New Selection Item'}
            </TertiaryButton>
        </>
    );



};
