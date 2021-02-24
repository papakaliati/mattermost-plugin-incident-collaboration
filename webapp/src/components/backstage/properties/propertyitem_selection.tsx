// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, { useState } from 'react';
import styled from 'styled-components';


import { TertiaryButton } from 'src/components/assets/buttons';

import { newSelectionlistItem, Selectionlist, SelectionlistItem } from 'src/types/playbook';
import { TitleItem } from './property_edit';
import { Droppable, DroppableProvided, Draggable, DraggableProvided, DragDropContext, DropResult } from 'react-beautiful-dnd';
import DragHandle from '../drag_handle';


interface Props {
    selectionlist: Selectionlist;
    selectionlistIndex?: string;
    setSelectionlist: (selectionlist: Selectionlist) => void;
}

const Container = styled.div`
    display: flex;
    flex-direction: column;
    border: 1px solid rgba(var(--center-channel-color-rgb), 0.12);
    border-radius: 4px;
    background-color: var(--center-channel-bg);
    padding: 20px;
`;

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
    }

    const onRemoveChecklistItem = (selectionItemIndex: number) => {
        const newSelectionlist = {
            ...props.selectionlist,
            items: [...props.selectionlist.items],
        } as Selectionlist;
        newSelectionlist.items.splice(selectionItemIndex, 1);
        props.setSelectionlist(newSelectionlist);
    };

    const onDragEnd = (result: DropResult) => {
        if (!result.destination) {
            return;
        }

        if (result.destination.droppableId === result.source.droppableId &&
            result.destination.index === result.source.index) {
            return;
        }


        if (result.type === 'selectionlist_item') {
            const sourceChecklistIndex = result.source.droppableId;
            const destinationChecklistIndex = result.destination.droppableId;
            onReorderChecklistItem(Number(sourceChecklistIndex), Number(destinationChecklistIndex), result.source.index, result.destination.index);
        }
    };

    const onReorderChecklistItem = (checklistIndex: number, newChecklistIndex: number, checklistItemIndex: number, newChecklistItemIndex: number): void => {
        const changedSelectionlist = props.selectionlist;
        const changedSelectionlistItems = [...changedSelectionlist.items];
        const [removed] = changedSelectionlistItems.splice(checklistItemIndex, 1);
        changedSelectionlistItems.splice(newChecklistItemIndex, 0, removed);
        changedSelectionlist.items = changedSelectionlistItems;
        props.setSelectionlist(changedSelectionlist);
        return;
    };

    return (
        <>
            Values
            <Container>
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable
                        droppableId='columns'
                        direction='vertical'
                        type='selectionlist_item'
                    >
                        {(droppableProvided: DroppableProvided) => (
                            <div
                                ref={droppableProvided.innerRef}
                                {...droppableProvided.droppableProps}
                            >
                                {props.selectionlist.items.map((item: SelectionlistItem, idx: number) => (
                                    <Draggable
                                        key={item.id + item.value + idx}
                                        draggableId={item.id + item.value + idx}
                                        index={idx}
                                    >
                                        {(draggableProvided: DraggableProvided) => (
                                            <DragHandle
                                                step={true}
                                                draggableProvided={draggableProvided}
                                                onDelete={() => onRemoveChecklistItem(idx)}
                                            >
                                                <TitleItem
                                                    key={props.selectionlistIndex + item.value + idx}
                                                    title={item.value}
                                                    setTitle={(value) => onChangeSelectionItem(idx, value)}
                                                />

                                            </DragHandle>
                                        )}
                                    </Draggable>
                                ))}
                                {droppableProvided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>

                <TertiaryButton
                    className='mt-3'
                    onClick={handleAddSelectionlistItem}
                >
                    <i className='icon-plus' />
                    {'New Selection Item'}
                </TertiaryButton>
            </Container>
        </>
    );



};
