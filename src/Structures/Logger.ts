import * as chalk from 'chalk';
export class Logger {
    public green(message: string): void {
        console.log(`[${chalk.cyan(new Date().toLocaleString())}] - ${chalk.green(message)}`);
    }
    public red(message: string): void {
        console.log(`[${chalk.cyan(new Date().toLocaleString())}] - ${chalk.red(message)}`);
    }
    public error(message: string): void {
        console.log(`[${chalk.red('**ERROR**')}] [${chalk.cyan(new Date().toLocaleString())}] - ${chalk.red(message)}`);
    }
}