import { BaseDirectory } from "@tauri-apps/api/path";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

interface BookmarkData {
    title: string;
    url: string;
    favicon: string;
}

const DEFAULT_BOOKSMARKS: BookmarkData[] = [
    {
        title: "Huly",
        url: "https://front.hc.engineering/",
        favicon: "https://front.hc.engineering/huly/favicon.ico"
    }
];

export class Bookmarks {
    private bookmarks: BookmarkData[] = [];

    all(): BookmarkData[] {
        return this.bookmarks;
    }

    add(title: string, url: string, favicon: string): void {
        const bookmark: BookmarkData = {
            title,
            url,
            favicon
        };

        this.bookmarks.push(bookmark);
    }

    remove(url: string): void {
        this.bookmarks = this.bookmarks.filter(bookmark => bookmark.url !== url);
    }

    async save(): Promise<void> {
        await writeTextFile('bookmarks.json', JSON.stringify(this.bookmarks), { baseDir: BaseDirectory.AppData });
    }

    async load(): Promise<void> {
        try {
            const content = await readTextFile('bookmarks.json', { baseDir: BaseDirectory.AppData });
            this.bookmarks = JSON.parse(content);
        } catch (err) {
            this.bookmarks = [...DEFAULT_BOOKSMARKS];
        }
    }
}