import './Withdraw.css'

export default function Withdraw(){
    return(
        <>
        <div >
            <form className='WithdrawForm'>
                <input type='number'></input>
                <select>
                    <option value={"NZD"}>NZD</option>
                    <option value={"USD"}>USD</option>
                    <option value={"More"}>More</option>
                </select>
                <button>Submit</button>
            </form>
        </div>
        </>
    );
}

// ammount
// currency
// button 
