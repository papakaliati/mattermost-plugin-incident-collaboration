import React, { FC, useEffect, useState } from 'react';

import styled, { css } from 'styled-components';

import { ChecklistItemState, PropertylistItem, PropertyType } from 'src/types/playbook';

import { BackstageSubheaderText, StyledSelect } from '../styles';
import { PropertySelectionlistEditor } from './propertyitem_selection';
import CollapsibleSection from '../collapsible_section';
import { ChecklistItemButton } from 'src/components/checklist_item';

export interface PropertyEditorProps {
    property: PropertylistItem;
    onUpdate: (updatedProperty: PropertylistItem) => void
}

const Container = styled.div`
    display: flex;
    flex-direction: column;
    border: 1px solid rgba(var(--center-channel-color-rgb), 0.12);
    border-radius: 4px;
    background-color: var(--center-channel-bg);
    padding: 20px;
    margin: 20px;
`;

const PropertyLine = styled.div`
    display: flex;
    direction: row;
`;

const PropertyInput = styled.input`
    -webkit-transition: border-color ease-in-out .15s, -webkit-box-shadow ease-in-out .15s;
    transition: border-color ease-in-out .15s, box-shadow ease-in-out .15s, -webkit-box-shadow ease-in-out .15s;
    background-color: rgb(var(--center-channel-bg-rgb));
    border: none;
    box-shadow: inset 0 0 0 1px rgba(var(--center-channel-color-rgb), 0.16);
    border-radius: 4px;
    margin-right: 20px;
    height: 40px;
    line-height: 40px;
    padding: 0 16px;
    flex: 0.5;
    font-size: 14px;

    &:focus {
        box-shadow: inset 0 0 0 2px var(--button-bg);
    }
`;

const InnerContainer = styled.div`
    display: flex;
    flex-direction: column;
`;

const ItemContainer = styled.div`
    padding-top: 1.3rem;
    :first-child {
        padding-top: 0.4rem;
    }
`;

const CheckboxContainer = styled.div`
    align-items: flex-start;
    display: flex;
    position: relative;

    button {
        width: 53px;
        height: 29px;
        border: 1px solid #166DE0;
        box-sizing: border-box;
        border-radius: 4px;
        font-family: Open Sans;
        font-style: normal;
        font-weight: 600;
        font-size: 12px;
        line-height: 17px;
        text-align: center;
        background: #ffffff;
        color: #166DE0;
        cursor: pointer;
        margin-right: 13px;
    }

    button:disabled {
        border: 0px;
        color: var(--button-color);
        background: var(--center-channel-color-56);
        cursor: default;
    }

    &:hover {
        .checkbox-container__close {
            opacity: 1;
        }
    }

    .icon-bars {
        padding: 0 0.8rem 0 0;
    }

    input[type="checkbox"] {
        -webkit-appearance: none;
        -moz-appearance: none;
        appearance: none;
        width: 20px;
        min-width: 20px;
        height: 20px;
        background: #ffffff;
        border: 2px solid var(--center-channel-color-24);
        border-radius: 4px;
        margin: 0;
        cursor: pointer;
        margin-right: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    input[type="checkbox"]:checked {
        background: var(--button-bg);
        border: 1px solid var(--button-bg);
        box-sizing: border-box;
    }

    input[type="checkbox"]::before {
        font-family: 'compass-icons', mattermosticons;
        text-rendering: auto;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        content: "\f12c";
        font-size: 12px;
        font-weight: bold;
        color: #ffffff;
        transition: transform 0.15s;
        transform: scale(0) rotate(90deg);
        position: relative;
    }

    input[type="checkbox"]:checked::before {
        transform: scale(1) rotate(0deg);
    }

    label {
        font-weight: normal;
        word-break: break-word;
        display: inline;
        margin: 0;
        margin-right: 8px;
        flex-grow: 1;
    }
`;

const CheckboxContainerLive = styled(CheckboxContainer)`
    height: 35px;
`;

interface TitleProps {
    title: string;
    setTitle: (title: string) => void;
}

export const TitleItem: FC<TitleProps> = (props: TitleProps) => {
    const [title, setTitle] = useState(props.title);

    const save = () => {
        if (title.trim().length === 0) {
            // Keep the original title from the props.
            setTitle(props.title);
            return;
        }

        props.setTitle(title);
    };

    return (
        <PropertyInput
            placeholder={'Property Name'}
            type='text'
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={save}
            autoFocus={!title}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') {
                    save();
                }
            }}
        />
    );
};


interface CheckItemProps {
    title: string;
    checked: boolean;
    setChecked: (item: boolean) => void;
}

export const CheckboxItem: FC<CheckItemProps> = (props: CheckItemProps) => {

    return (
        <CheckboxContainerLive>
            <input
                className='checkbox'
                type='checkbox'
                checked={props.checked}
                onChange={() => {
                    if (props.checked) {
                        props.setChecked(false);
                    } else {
                        props.setChecked(true);
                    }
                }}
            />
            <label title={props.title}>
                {props.title}
            </label>
        </CheckboxContainerLive>
        // <div>
        //     <BackstageSubheaderText>
        //         {props.title}
        //     </BackstageSubheaderText>
        //     <input
        //         className='checkbox'
        //         type='checkbox'
        //         checked={props.checked}
        //         onChange={() => {
        //             if (props.checked) {
        //                 props.setChecked(false);
        //             } else {
        //                 props.setChecked(true);
        //             }
        //         }}
        //     />
        // </div>
    );
};



const commonSelectStyle = css`
    flex-grow: 1;
    background-color: var(--center-channel-bg);

    .channel-selector__menu-list {
        background-color: var(--center-channel-bg);
        border: none;
    }

    .channel-selector__input {
        color: var(--center-channel-color);
    }

    .channel-selector__option--is-selected {
        background-color: var(--center-channel-color-08);
    }

    .channel-selector__option--is-focused {
        background-color: var(--center-channel-color-16);
    }

    .channel-selector__control {
        transition: all 0.15s ease;
        transition-delay: 0s;
        background-color: transparent;
        border-radius: 4px;
        border: none;
        box-shadow: inset 0 0 0 1px var(--center-channel-color-16);
        width: 100%;
        height: 4rem;
        font-size: 14px;

        &--is-focused {
            box-shadow: inset 0 0 0px 2px var(--button-bg);
        }
    }

    .channel-selector__option {
        &:active {
            background-color: var(--center-channel-color-08);
        }
    }

    .channel-selector__single-value {
        color: var(--center-channel-color);
    }
`;

interface ComboboxItemProps {
    option: string;
    options: string[];
    setOption: (item: string) => void;
}

export const ComboboxItem: FC<ComboboxItemProps> = (props: ComboboxItemProps) => {
    return (
        <StyledSelect
            value={{ value: props.option, label: props.option }}
            onChange={(e) => {
                props.setOption(e.value);
            }}
            options={props.options.map(t => ({ value: t, label: t }))}
        />
    );
};

const Divider = styled.div`
    padding-bottom: 20px;
`

const Floater = styled.div`
    float:left;

    `
const PropertyEditor: FC<PropertyEditorProps> = (props: PropertyEditorProps) => {
    const submit = (propertylistItem: PropertylistItem) => {
        props.onUpdate(propertylistItem);
    };

    return (
        <CollapsibleSection
            title={props.property.title}
            onTitleChange={(title) => submit({ ...props.property, title })}
        >
            <Container>
                <PropertyLine>
                    <InnerContainer>

                        <div className='side-by-side'>
                            <div className='inner-container first-container'>
                                <CheckboxItem
                                    title='Is Mandatory'
                                    checked={props.property.is_mandatory}
                                    setChecked={(is_mandatory) => submit({ ...props.property, is_mandatory })}
                                />
                                <Divider>
                                    <ComboboxItem
                                        option={props.property.type}
                                        options={Object.keys(PropertyType)}
                                        setOption={(option) => {
                                            let type: PropertyType;
                                            if (option === "Freetext") {
                                                type = PropertyType.Freetext;
                                            }
                                            else {
                                                type = PropertyType.Selection;
                                            }
                                            submit({ ...props.property, type })
                                        }}
                                    />
                                </Divider>
                                {props.property.type === PropertyType.Freetext && props.property.freetext &&
                                    <CheckboxItem
                                        title='Is Multiselect'
                                        checked={props.property.freetext.is_multiselect}
                                        setChecked={(is_multiselect) => {
                                            if (props.property.freetext)
                                                props.property.freetext.is_multiselect = is_multiselect;
                                            submit({ ...props.property })
                                        }}
                                    />
                                }
                                {props.property.type === PropertyType.Selection && props.property.selection &&
                                    <CheckboxItem
                                        title='Is Multiselect'
                                        checked={props.property.selection.is_multiselect}
                                        setChecked={(is_multiselect) => {
                                            if (props.property.selection)
                                                props.property.selection.is_multiselect = is_multiselect;
                                            submit({ ...props.property })
                                        }}
                                    />
                                }
                            </div>
                            <div className='first-title'>
                                {props.property.type === PropertyType.Selection && props.property.selection &&
                                    <PropertySelectionlistEditor
                                        key={props.property.id}
                                        selectionlist={props.property.selection}
                                        selectionlistIndex={props.property.selection.selected_id}
                                        setSelectionlist={(selection: any) => submit({ ...props.property, selection })}
                                    />
                                }
                            </div>
                        </div>

                    </InnerContainer>

                </PropertyLine>
            </Container>
        </CollapsibleSection>
    );
};

export default PropertyEditor;
