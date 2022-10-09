export function formatDuration (ms: number) {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor(((ms % 360000) % 60000) / 1000);
    return `${hours ? `${hours}:` : ''}${minutes < 10 ? `0${minutes}` : minutes}:${seconds < 10 ? `0${seconds}` : seconds}`;
}