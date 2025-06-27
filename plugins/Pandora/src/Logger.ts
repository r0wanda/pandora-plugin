import { actions } from "@neptune";

export function log(message: string) {
    actions.message.messageInfo({ message });
}
export function warn(message: string) {
    actions.message.messageWarn({ message });
}
export function error(message: any) {
    if (message instanceof Error) {
        actions.message.messageError({ message: `[Pandora] ${message.message}` });
    } else {
        actions.message.messageError({ message: message.toString() });
    }
}
