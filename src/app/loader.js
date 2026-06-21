import { Unzip, AsyncUnzipInflate } from 'fflate';
import { loadTask, loadEstimatedTime, data, dmTranscripts, channelTranscripts } from './store';
import { extractData } from './extractor';
import { generateFileStructureDump, generateGitHubIssueURL } from './helpers';

export class LoadError extends Error {
    constructor(message, reportURL = null) {
        super(message);
        this.reportURL = reportURL;
    }
}

/**
 * Unzip, validate and extract a Discord data package, then populate the
 * data/dmTranscripts/channelTranscripts stores. Throws a LoadError (with an
 * optional pre-filled GitHub report URL) on anything the user can act on.
 * @param file The package.zip File selected/dropped by the user
 */
export const loadPackageFile = async (file) => {
    if (!file.stream) {
        throw new LoadError('This browser is not supported. Try using Google Chrome instead.');
    }

    const uz = new Unzip();
    uz.register(AsyncUnzipInflate);
    const files = [];
    uz.onfile = (f) => files.push(f);

    const reader = file.stream().getReader();
     
    while (true) {
        const { done, value } = await reader.read();
        if (done) {
            uz.push(new Uint8Array(0), true);
            break;
        }
        for (let i = 0; i < value.length; i += 65536) {
            uz.push(value.subarray(i, i + 65536));
        }
    }

    const throwWithReport = (errorMsg) => {
        const fileStructure = generateFileStructureDump(files);
        throw new LoadError(errorMsg, generateGitHubIssueURL(errorMsg, fileStructure));
    };

    if (files.some((f) => f.name.startsWith('package/'))) {
        throwWithReport('Seems like you unzipped and re-zipped your package file. To fix this issue, instead of right clicking on the package folder and zipping it, you should open the folder, select all files inside it, and zip them directly. Name the resulting file "package.zip" and try again.');
    }
    const hasUserJson = files.some((f) => /^([^/]+)\/user\.json$/.test(f.name));
    const hasMessages = files.some((f) => /\/c?[0-9]{16,32}\/channel\.json$/.test(f.name));
    if (!hasUserJson && !hasMessages) {
        throwWithReport('Your package looks empty or in an unexpected format. Make sure you uploaded the original <code>package.zip</code> from Discord.');
    }
    if (!hasUserJson) {
        throwWithReport('Your package is missing the <strong>Account info</strong> section. This app needs it to identify you. Please re-request your data on Discord with at least <em>Account info</em> and <em>Messages</em> selected.');
    }
    if (!hasMessages) {
        throwWithReport('Your package does not contain any <strong>Messages</strong>. Please re-request your data on Discord with the <em>Messages</em> category selected.');
    }

    const extractStartAt = Date.now();
    try {
        const { dmTranscripts: transcripts, channelTranscripts: chanTranscripts, ...extractedData } = await extractData(files);
        data.set(extractedData);
        dmTranscripts.set(transcripts);
        channelTranscripts.set(chanTranscripts);
        console.log(`[debug] Data extracted in ${(Date.now() - extractStartAt) / 1000} seconds.`);
    } catch (err) {
        console.error(err);
        if (err.message === 'invalid_package_missing_messages') {
            throwWithReport('Some data is missing in your package, therefore it can not be read. <br> It is a bug on Discord side (06-10-21), and will be fixed in the next few days. <br> Join <a href="https://androz2091.fr/discord">our Discord</a> to get more information.');
        }
        throwWithReport('Something went wrong while reading your package. Please try again.');
    } finally {
        loadTask.set(null);
        loadEstimatedTime.set(null);
    }
};
