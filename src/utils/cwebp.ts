/**
 * This is a module for compressing the image into WebP.
 * Compressing the image will greaty reduced image size with a lil winny lossy image.
 * 
 * @file
 * @author AozoraDev
 */

import decompress from "decompress"
import path from "path";
import sizeOf from "image-size";
import { WebP } from "enums";
import { $ } from "bun";
import { tmpdir } from "node:os";
import { mkdtempSync } from "fs";
import { rm, rename, exists } from "fs/promises";

import type { WebPConfig } from "types";
import type { ISizeCalculationResult } from "image-size/dist/types/interface";

export default class CWebP {
    /** Array buffer of the image */
    private buf: ArrayBuffer;

    /** Path to the cwebp executable */
    private cwebpPath: string;

    /** Configuration */
    private configs: WebPConfig;

    /** Original size of the image */
    public size: ISizeCalculationResult;

    /** Current platform's name */
    private platform?: ("windows" | "mac" | "linux");

    /** Current platform's architecture */
    private arch?: ("aarch64" | "arm64" | "x86-64");

    /** Temporary dir for temporary saving converted image */
    private readonly tempDir = mkdtempSync(path.join(tmpdir(), "cwebp-"));

    /**
     * Create new instance for converting image to webp
     * 
     * @param buf - Array buffer of the image
     * @param configs - Configuration
     */
    public constructor(buf: ArrayBuffer, configs?: WebPConfig) {
        const defaultConfigs: WebPConfig = {
            quality: WebP.QUALITY,
            cwebpPath: "",
            options: []
        }

        this.buf = buf;
        this.size = sizeOf(new Uint8Array(buf));
        this.configs = { ...defaultConfigs, ...configs }
        this.cwebpPath = this.configs.cwebpPath || Bun.which("cwebp") || WebP.LOCAL_CWEBP_PATH;
    }

    /** A lil bit of process before executing */
    private async preExecute() {
        if (!await exists(this.cwebpPath)) {
            console.warn("cwebp binaries not found! Will downloading webp now!");
            await this.downloadExecutable();

            this.cwebpPath = WebP.LOCAL_CWEBP_PATH;
            console.log("WebP downloaded and extracted!");
        }
    }

    /** A process to execute the compression */
    private async execute() {
        await this.preExecute();

        /** Path to the temporary image */
        const imagePath = path.join(this.tempDir, "image");
        /** Path to the temporary converted image */
        const webpImagePath = path.join(this.tempDir, "image.webp");
                
        const args = [
            `"${this.cwebpPath}"`, // Executable
            `"${imagePath}"`, // Path to the temp image
            `-q ${this.configs.quality}`, // Quality
            this.configs.options?.join(" "), // Additional options
            `-o "${webpImagePath}"`
        ]

        await Bun.write(imagePath, this.buf);
        await $`${{ raw: args.join(" ") }}`;
    }

    /** Get the output as BunFile */
    public async toBunFile() {
        await this.execute();
        return Bun.file(path.join(this.tempDir, "image.webp"));
    }

    /**
     * Remove the temporary file.
     * It's recommended to call this function after done using BunFile.
     */
    public async close() {
        return rm(this.tempDir, { recursive: true });
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

        if (!this.arch || !this.platform) throw new Error("WebP binaries is not available for your platform!");
        
        // Download the binaries
        const buf = await fetch(url).then(res => res.arrayBuffer());
        await this.extractExecutable(buf)
    }

    /** Extract the downloaded binaries */
    private async extractExecutable(buf: ArrayBuffer) {
        await decompress(Buffer.from(buf), process.cwd())
        await rename(
            path.join(process.cwd(), `libwebp-${this.getWebPVersion()}-${this.platform}-${this.arch}`),
            path.join(process.cwd(), "webp")
        );
    }

    /** Get WebP version */
    private getWebPVersion() {
        return WebP.VERSION;
    }
}