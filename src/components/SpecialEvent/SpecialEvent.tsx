import './SpecialEvent.css'
import { useNavigate } from 'react-router-dom';

interface SpecialEventProps{
    EventHook: string;
    EventTitle: string;
    EventDescription: string;
    EventImage: string;
    EventLink: string;
}


export default function SpecialEvent({EventHook, EventTitle, EventDescription, EventImage, EventLink}: SpecialEventProps)
{
    const navigate = useNavigate();

    return (
        <>
            <div className='SpecialEventContainer'>
                <div className='LeftColumn Column'>
                    <div className='EventHook EventSection'><strong>{EventHook}</strong></div>
                    <div className='EventDescription EventSection'><strong>{EventTitle}</strong> <br/> {EventDescription}</div>
                </div>
                <div className='RightColumn Column'>
                    <div className='EventImage EventSection'><img src={EventImage}/></div>
                    <div className='EventButton EventSection' onClick={() => navigate(EventLink)}><strong>Play Now!</strong></div>
                </div>
            </div>
        </>
    );
}