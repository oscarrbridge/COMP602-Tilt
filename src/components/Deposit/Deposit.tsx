import './Deposit.css'

export default function Deposit() {
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