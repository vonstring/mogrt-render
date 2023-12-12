import { render } from '@nexrender/core';
import { temporaryDirectoryTask } from 'tempy';
import { program } from 'commander';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import which from 'which';

program
    .name('mogrt-render')
    .option('-d, --debug', 'Adds a large amount of debug information')
    .option('-f, --from <from>', 'The start frame')
    .option('-t, --to <to>', 'The end frame')
    .argument('<mogrt>')
    .argument('<output>')
program.parse();

async function main() {
    const options = program.opts();
    const [ mogrtFn, outputFn] = program.args;
    process.env['NEXRENDER_FFMPEG'] = process.env['NEXRENDER_FFMPEG'] || await which('ffmpeg');

    temporaryDirectoryTask(async temporaryPath => {
        const settings = {
            workpath: temporaryPath,
            skipcleanup: false,
            addLicense: false,
            debug: false,
            logger: {
                log: () => {}
            }
        }

        if (options.debug) {
            Object.assign(settings, {
                debug: true,
                logger: console
            })
        }

        const postrender = [];

        if (path.extname(outputFn) === '.mp4') {
            postrender.push(
                {
                    module: '@nexrender/action-encode',
                    preset: 'mp4',
                    output: 'encoded.mp4',
                },
                {
                    module: '@nexrender/action-copy',
                    input: 'encoded.mp4',
                    output: path.resolve(process.cwd(), outputFn)
                }
            )
        } else if (path.extname(outputFn) === '.png') {
            postrender.push(
                {
                    module: '@nexrender/action-encode',
                    params: {
                        "-vcodec": "png",
                        "-start_number": 0,
                        "-r": 1,
                        "vf": "select=eq(n\\,0)"
                    },
                    output: 'encoded.png',
                },
                {
                    module: '@nexrender/action-copy',
                    input: 'encoded.png',
                    output: path.resolve(process.cwd(), outputFn)
                }
            );
        }

        const renderOptions = {
            template: {
                src: pathToFileURL(mogrtFn).toString(),
                composition: 'not_applicable'
            },
            actions: {
                predownload: [
                    {
                        module: 'nexrender-action-mogrt-template',
                        essentialParameters: {}
                    }
                ],
                postrender: [
                ]
            },
            onChange: (job, state) => {
                console.log(state);
            },
            onRenderProgress: (job, progress) => {
                console.log(progress);
            }
        }

        if (options.from) {
            renderOptions.template.frameStart = options.from;
        }

        if (options.to) {
            renderOptions.template.frameStart = options.to;
        }
        const result = await render(renderOptions, settings);
    });
}

main().catch(console.error);