import classNames from "classnames"
import React, {FC, useState} from "react"
import styled from "styled-components";


const SearchBarContainer = styled.div`
    padding: 0 4px 0 8px;
    border: 1px solid v(center-channel-color-24);

    &:hover {
        border: 1px solid v(center-channel-color-40);

`;

const SearchBarForm = styled.form`
    color: var(--center-channel-color);
    border-color: rgba(var(--center-channel-color-rgb), 0.16);
    border-radius: 2px;

    border: 1px solid v(center-channel-color-24);

    &:hover {
        border: 1px solid v(center-channel-color-40);
    }
    
`;

const SearchBarInput = styled.input`
    font-size: 14px;
    padding-left: 30px;
    height: 32px; 
    
    border: 1px solid v(center-channel-color-24);

    &:hover {
        border: 1px solid v(center-channel-color-40);
    }
`;

interface SearchbarProps {
    search: string, 
    setSearch: (search: string) => void;
}

export const SearchBar: FC<SearchbarProps> = (props: SearchbarProps) => {
    const [search, setSearch] = useState(props.search);

    return (
        <SearchBarContainer
           
        >
            <SearchBarForm
                role='application'
                className={classNames(['search__form'])}
                autoComplete='off'
                aria-labelledby='searchBox'
            >
                <div className='search__font-icon'>
                    <i className='icon icon-magnify icon-16' />
                </div>
                <SearchBarInput
                    placeholder='Search'
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value)
                        props.setSearch(e.target.value)
                        }
                    }
                />
            </SearchBarForm>
        </SearchBarContainer>
    );
}