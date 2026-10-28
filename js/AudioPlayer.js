export class AudioPlayer {

    #audio;
    #timeoutId = null;

    constructor(src, volume = 1) {
        this.#audio = new Audio(src);
        this.#audio.volume = volume;
    }

    stop() {
        clearTimeout(this.#timeoutId);
        this.#audio.pause();
        this.#audio.currentTime = 0;
    }

    play(maxMs = 5000) {
        this.stop();
        this.#audio.play().catch(function (err) {
            console.error("Audio playback failed:", err);
        });
        this.#timeoutId = setTimeout(() => this.stop(), maxMs);
    }
    
}