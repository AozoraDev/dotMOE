/**
 * This is a module for compressing the image into WebP.
 * Compressing the image will greaty reduced image size with a lil winny lossy image.
 * 
 * @file
 * @author AozoraDev
 */

import Zip from "adm-zip";
import path from "path";
import sizeOf from "image-size";
import { $ } from "bun";
import { existsSync } from "fs";
import { tmpdir } from "node:os";
import { rm, rename, mkdtemp } from "fs/promises";

import type { ISizeCalculationResult } from "image-size/dist/types/interface";

interface Configs {
    /** The quality of compression. Default is 80 */
    quality?: number,
    /** cwebp executable path. Default is from $PATH or `webp` in cwd */
    cwebpPath?: string
    /** Additional options */
    options?: string[]
}

export default class CWebP {
    /** Array buffer of the image */
    private buf: ArrayBuffer;
    /** Path to the cwebp executable */
    private cwebpPath: string;
    /** Configuration */
    private configs: Configs;
    /** Original size of the image */
    private size: ISizeCalculationResult;

    /** Path to the downloaded webp binaries */
    private downloadedPath = path.join(process.cwd(), "webp-bin");
    /** Current platform's name */
    private platform?: ("windows" | "mac" | "linux");
    /** Current platform's architecture */
    private arch?: ("aarch64" | "arm64" | "x86-64");

    /**
     * Create new instance for converting image to webp
     * 
     * @param buf - Array buffer of the image
     * @param configs - Configuration
     */
    public constructor(buf: ArrayBuffer, configs?: Configs) {
        const defaultConfigs: Configs = {
            quality: 80,
            cwebpPath: "",
            options: []
        }

        this.buf = buf;
        this.size = sizeOf(new Uint8Array(buf));
        this.configs = { ...defaultConfigs, ...configs }
        this.cwebpPath = this.configs.cwebpPath || Bun.which("cwebp") || path.join(process.cwd(), "webp", "bin", "cwebp");
    }

    /** Get image original width */
    public getWidth() {
        return this.size.width || 0;
    }

    /** Get image original height */
    public getHeight() {
        return this.size.height || 0;
    }

    /** A lil bit of process before executing */
    private async preExecute() {
        // Check the cwebp executable
        // If not exists, download the webp binaries.
        if (!this.checkExecutable()) {
            console.warn("cwebp binaries not found! Downloading...");
            await this.downloadExecutable();

            console.log("Extracting binaries...");
            if (process.platform == "linux" || process.platform == "darwin") { // Linux and Mac

                if (!Bun.which("tar")) throw new Error("tar executable not found. That's weird... are you even sure that your OS is Unix-like?");
                await $`tar -xzf "${this.downloadedPath}"`.quiet();

            } else if (process.platform == "win32") { // Windows

                const zip = new Zip(this.downloadedPath);
                zip.extractAllTo(process.cwd());
                
            } else { // Nothing else
                throw new Error("WebP binaries not available for your platform!");
            }

            // Remove the downloaded binaries
            await rm(this.downloadedPath);
            // After that, rename the extracted folder
            await rename(
                path.join(process.cwd(), `libwebp-${this.getWebPVersion()}-${this.platform}-${this.arch}`),
                path.join(process.cwd(), "webp")
            );

            // Update path
            this.cwebpPath = path.join(process.cwd(), "webp", "bin", "cwebp");
            console.log("WebP downloaded and extracted!");
        }
    }

    /** A process to execute the compression */
    private async execute() {
        // Add exe to the executable if windows
        if (this.platform == "windows") this.cwebpPath += ".exe";
        
        /** Temporary dir for temporary saving converted image */
        const temp = await mkdtemp(path.join(tmpdir(), "cwebp-"));
        /** Path to the temporary image */
        const imagePath = path.join(temp, "image");
        /** Path to the temporary converted image */
        const webpImagePath = path.join(temp, "image.webp")
        
        // Write the buffer to file
        try {
            await Bun.write(imagePath, this.buf);
        } catch (e) {
            throw new Error("Cannot access the temporary dir");
        }

        const args = [
            `"${this.cwebpPath}"`, // Executable
            `"${imagePath}"`, // Path to the temp image
            `-q ${this.configs.quality}`, // Quality
            this.configs.options?.join(" "), // Additional options
            `-o "${webpImagePath}"`
        ]
        await $`${{ raw: args.join(" ") }}`;

        // Get the ArrayBuffer of the converted file
        const buf = await Bun.file(webpImagePath).arrayBuffer();
        // And remove the temp dir now
        await rm(temp, { recursive: true });

        return buf;
    }

    /** Get the output as ArrayBuffer */
    public async toArrayBuffer() {
        await this.preExecute();
        const output = await this.execute();

        return output;
    }

    /** Get the output as Uint8Array */
    public async toUint8Array() {
        await this.preExecute();
        const output = await this.execute();

        return new Uint8Array(output);
    }

    /** Get the output as Buffer */
    public async toBuffer() {
        const output = await this.toArrayBuffer();

        return Buffer.from(output);
    }

    /** Get the output as Blob */
    public async toBlob() {
        const output = await this.toArrayBuffer();

        return new Blob([output], { type: "image/webp" });
    }

    /////////////
    // Options //
    /////////////

    /**
     * Add resize image option
     * 
     * @param width - Width of the image. Set to `0` for keeping aspect ratio with height
     * @param height - Height of the image. Set to `0` for keeping aspect ratio with width
     */
    public resize(width?: number, height?: number) {
        this.configs.options?.push(`-resize ${width || 0} ${height || 0}`);
        return this;
    }

    /** Don't print the progress output to console */
    public quite() {
        this.configs.options?.push("-quiet");
        return this;
    }

    /////////////////
    // End Options //
    /////////////////

    /** Check if cwebp executable exists */
    private checkExecutable() {
        return existsSync(this.cwebpPath);
    }

    /** Download cwebp binaries when not exists */
    private async downloadExecutable() {
        switch (process.arch) {
            case "arm64":
                this.arch = "aarch64";
            break;
            case "x64":
                this.arch = "x86-64";
            break;
        }

        switch (process.platform) {
            case "linux":
                this.platform = "linux";
            break;
            case "win32":
                this.platform = "windows";
            break;
            case "darwin":
                this.platform = "mac";
                if (this.arch == "aarch64") this.arch = "arm64"; // The repo using arm64 for Mac instead of aarch64
            break;
        }

        const url = (this.platform == "windows")
            ? `https://storage.googleapis.com/downloads.webmproject.org/releases/webp/libwebp-${this.getWebPVersion()}-windows-x64.zip`
            : `https://storage.googleapis.com/downloads.webmproject.org/releases/webp/libwebp-${this.getWebPVersion()}-${this.platform}-${this.arch}.tar.gz`;

        // Download the binaries
        try {
            // Check if arch and platform exists
            if (!this.arch || !this.platform) throw new Error("WebP binaries is not available for your platform!");

            const buf = await fetch(url).then(res => res.arrayBuffer()) // Get the file as ArrayBuffer
            await Bun.write(this.downloadedPath, buf); // And then write it as file
        } catch (e) {
            throw e;
        }
    }

    /** Get WebP version */
    private getWebPVersion() {
        return "1.4.0";
    }
}