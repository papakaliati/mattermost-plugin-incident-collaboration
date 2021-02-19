import React, { FC, useState, useEffect } from "react";
import { StylesConfig } from "react-select";
import CreatableSelect from 'react-select/creatable';
import { MultiValueGeneric } from "react-select/src/components/MultiValue";
import styled from "styled-components";

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


interface Option {
    value: string;
    label: JSX.Element | string;
}

interface PropertyFreeTextMultiselectProps {
    value: string;
    propertyId: string;
    onSelectedChange: (propertyId: string, selectedValue: string) => void;
}

export const PropertyFreeTextMultiselectItem: FC<PropertyFreeTextMultiselectProps> = (props: PropertyFreeTextMultiselectProps) => {
    let [selectedValues, setSelectedValues] = useState<Option[] | null>(null);

    useEffect(() => {
        if (props.value) {
            const selected = props.value.split(",");
            let options: Option[] = []
            selected.forEach((item: string) => {
                options.push({value: item, label: item} );
            });

            selectedValues = options;
            setSelectedValues(options);
        }
    }, [props.value]
    );

    const handleChange = (newValue: any, actionMeta: any) => {
        var values = new Array()
        newValue.forEach((element: { value: any; }) => {
            values.push(element.value)
        });

        props.onSelectedChange(props.propertyId, values.join(","))
    };

    return (
        <CreatableSelect
            isMulti
            value={selectedValues}
            onChange={handleChange}
            style={ReactSelectStyles}
            isClearable={false}
        />
    );
};

export const ReactSelectStyles: StylesConfig = {
    menu: (base) => ({...base,  border: '0px solid black', display: 'none' }),
    multiValueRemove: () => ({ display: 'none'}),
    // dropdownIndicator: () => ({ display: 'none'}),
    // indicatorSeparator: () => ({ display: 'none'}),
    // indicatorsContainer: () => ({ display: 'none'}),
    valueContainer: (base) => ({ ...base, padding: '0px'}),
    control: (base) => ({ ...base, 
        border: '0px solid black',
        padding: '0px',  
        minHeight: '8px',   
        boxShadow: 'none',
        borderWidth: '0px'
    }),
    container: (base) => ({ ...base, 
        border: '0px solid black'
    }),
    multiValue:(base) => ({ ...base, padding: '0px', borderRadius: '4px', background: 'var(--center-channel-color-16);'}),
    multiValueLabel:(base) => ({...base, fontWeight: 600, padding: '0px', paddingRight:'8px', paddingLeft:'8px', fontSize: 12, color: 'var(--center-channel-color-72);'})
};

interface PropertyFreeTextProps {
    title: string;
    propertyId: string;
    onSelectedChange: (propertyId: string, selectedValue: string) => void;
}

export const PropertyFreeTextItem: FC<PropertyFreeTextProps> = (props: PropertyFreeTextProps) => {
    const [title, setTitle] = useState(props.title);

    const save = () => {
        props.onSelectedChange(props.propertyId, title)
    };

    return (
        <PropertyInput
            placeholder={'Property Name'}
            type='text'
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus={!title}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') {
                    save();
                }
            }}
        />
    );
};