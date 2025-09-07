import './GameCard.css'

interface GameCardProps {
    Text: string
    Image: string
}

export default function GameCard({ Text, Image }: GameCardProps) {
    return (
        <>
            <div className='GameCardImage' style={{ backgroundImage: `url(${Image})` }}>
                <div className='GameCardText'>
                    <h3>{Text}</h3>
                </div>
            </div>
        </>
    )
}