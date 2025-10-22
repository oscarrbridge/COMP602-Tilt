import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import './BlackjackFX.css';
const range = (n) => Array.from({ length: n }, (_, i) => i);
export default function BlackjackFX({ result }) {
    const [nonce, setNonce] = useState(0);
    const model = useMemo(() => {
        if (!result)
            return null;
        // rainbow confetti w/ different arc radii
        const confetti = range(48).map((i) => {
            const angle = (i / 48) * Math.PI * 2 + Math.random() * 0.3;
            const radius = 70 + Math.random() * 110;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * (radius * 0.6);
            const rot = (Math.random() * 320 + 80) * (Math.random() > 0.5 ? 1 : -1);
            const delay = i * 6 + Math.random() * 140;
            const hue = Math.floor(Math.random() * 360);
            return { x, y, rot, delay, hue };
        });
        // bright chip burst (more pieces + deeper spread)
        const chips = range(22).map((i) => {
            const angle = (i / 22) * Math.PI * 2 + Math.random() * 0.6;
            const dx = Math.cos(angle) * (70 + Math.random() * 110);
            const dy = -80 - Math.random() * 140;
            const z = Math.random() * 60;
            const delay = i * 10 + Math.random() * 80;
            return { dx, dy, z, delay };
        });
        // rotating light beams on win
        const beams = range(8);
        // loss shards + “crack” overlay
        const shards = range(28).map((i) => ({ delay: i * 22 + Math.random() * 90 }));
        return { confetti, chips, beams, shards };
    }, [result]);
    useEffect(() => {
        if (result)
            setNonce((n) => n + 1);
    }, [result]);
    if (!result || !model)
        return null;
    return (_jsxs("div", { className: `bj-fx bj-fx--${result}`, "aria-hidden": true, children: [_jsx("div", { className: 'bj-fx__vignette' }), result === 'loss' && _jsx("div", { className: 'bj-fx__flash' }), result === 'win' && (_jsxs(_Fragment, { children: [_jsx("div", { className: 'bj-fx__ring' }), _jsx("div", { className: 'bj-fx__beams', children: model.beams.map((i) => (_jsx("span", { style: { ['--i']: i } }, i))) }), _jsx("div", { className: 'bj-fx__chips', children: model.chips.map((c, i) => (_jsx("span", { style: {
                                '--dx': `${c.dx}px`,
                                '--dy': `${c.dy}px`,
                                '--dz': `${c.z}px`,
                                '--delay': `${c.delay}ms`,
                            } }, i))) }), _jsx("div", { className: 'bj-fx__confetti', children: model.confetti.map((c, i) => (_jsx("span", { style: {
                                '--x': `${c.x}px`,
                                '--y': `${c.y}px`,
                                '--rot': `${c.rot}deg`,
                                '--delay': `${c.delay}ms`,
                                '--hue': c.hue,
                            } }, i))) }), _jsx("div", { className: 'bj-fx__sparkle', children: range(18).map((i) => (_jsx("i", { style: { ['--d']: `${i * 70}ms` } }, i))) }), _jsx("div", { className: 'bj-fx__chroma' })] })), result === 'loss' && (_jsxs(_Fragment, { children: [_jsx("div", { className: 'bj-fx__crack' }), _jsx("div", { className: 'bj-fx__shards', children: model.shards.map((s, i) => (_jsx("span", { style: { ['--delay']: `${s.delay}ms` } }, i))) }), _jsx("div", { className: 'bj-fx__smoke' })] })), result === 'tie' && _jsx("div", { className: 'bj-fx__sheen' })] }, nonce));
}
