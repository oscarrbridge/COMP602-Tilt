import './SearchBar.css'

interface SearchBarProps
{
    Placeholder:string;
}

export default function SearchBar({Placeholder}:SearchBarProps)
{
    return (
        <>
        <div className='SearchBarContainer'>
            <input type='text' placeholder={Placeholder} className='SearchBar'></input>
        </div>
        </>
    );
}