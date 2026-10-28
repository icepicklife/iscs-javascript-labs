export class ClipboardService {
    
    static copy(text) {
        return navigator.clipboard.writeText(text);
    }
    
}