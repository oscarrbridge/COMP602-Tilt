import './Deposit.css'

export default function Deposit() {
    return(
        <>
            <div>
                <br />
                <form className='WithdrawForm'>
                    <label>Amount:</label>
                    <input type='number' placeholder="Enter amount"></input>
                    <label>Currency:</label>
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