import { isFQDN, isURL } from "validator";

export function processSearchString(searchString: string) {
    let fqdn = isFQDN(searchString);
    let url = isURL(searchString, { require_tld: false, require_protocol: true, require_valid_protocol: false });

    if (fqdn || url) {
        return searchString;
    }
    return `https://www.google.com/search?q=${searchString}`;
}