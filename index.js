#! /usr/bin/env node


const yargs = require('yargs');
const argv = yargs
    .command('--current', 'select current branch')
    .command('--checkout', 'checkout branch')
    .command('--edit', 'edit branch description')
    .command('--delete', 'delete branch')
    .command('--show', 'show branch')
    .demandCommand(0)
    .help()
    .argv

// 引数で指定できる操作は1つのみ
let argvAction = '';
if (argv.checkout) {
    argvAction = 'checkout';
}
else if (argv.edit) {
    argvAction = 'edit';
}
else if (argv.delete) {
    argvAction = 'delete';
}
else if (argv.show) {
    argvAction = 'show';
}

const selectCurrentBranch = argv.current;
const showMode = argvAction === 'show';

const commands = [
    { id: 'checkout', description: 'Checkout branch', action: (branch) => { execBranchAction(`git checkout ${branch}`); }, exceptingCurrentBranch: true, disabled: `Already on` },
    { id: 'edit', description: 'Edit description', action: (branch) => { execSyncBranchAction(`git branch --edit-description ${branch}`); }, exceptingCurrentBranch: false },
    { id: 'delete', description: 'Delete branch', action: (branch) => { execBranchAction(`git branch -d ${branch}`); }, exceptingCurrentBranch: true, disabled: `Cannot delete` },
];
const commandsMap = commands.reduce((map, command) => {
    map[command.id] = command;
    return map;
}, {});

const { execSync, exec } = require('child_process');
const inquirer = require('inquirer');

/**
 * リポジトリのローカルブランチ一覧
 * @return Promise<string>
 */
const execGetBranches = () => {
    return new Promise((resolve, reject) => {
        exec('git branch', (error, stdout, stderr) => {

            if (stderr || error) {
                console.error(stderr);
                reject();
                return;
            }

            const branches = stdout.split('\n').filter(Boolean);
            // 改行でブランチを分割し、カレントブランチのマークや空白を削除した配列を取得する
            resolve({
                list: branches.map((branch) => branch.replace('*', '').trim()),
                current: branches.find((branch) => branch.includes('*')).replace('*', '').trim()
            });
        });
    });
}

/**
 * inquirer listへ渡すためのブランチ名とブランチ説明テキストを合わせたオブジェクトを取得する
 * @param branch string
 * @returns Promise<{name:string, value:string}>
 */
const execGetBranchDescription = (branch, isCurrent, action) => {
    return new Promise((resolve, reject) => {
        exec(`git config branch.${branch}.description`, (error, stdout, stderr) => {
            const mark = (isCurrent ? '* ' : '  ');
            let disabledOption = {};
            if (action && isCurrent && commandsMap[action] && commandsMap[action].exceptingCurrentBranch)
            {
                disabledOption = { disabled: `${action} cannot be executed`};
            }

            if (error || stderr) {
                // `git config branch.${branch}.description`の中身がない場合はエラーがでるので無視してすすめる
                return resolve({ name: mark + branch, value: branch, ...disabledOption });
            }
            return resolve({
                name: `${mark}${branch} : ${stdout.trim()}`,
                value: branch,
                ...disabledOption
            });
        });
    });
}

async function main() {

    const branches = await execGetBranches();
    const currentBranch = branches.current;
    const branchWithDescription = await Promise.all(branches.list.map(branch => execGetBranchDescription(branch, branch === currentBranch, argvAction)));

    // ブランチ名を選択する
    const branch = selectCurrentBranch ? currentBranch : await inquirer.prompt([
        {
            type: 'list',
            name: 'branch',
            message: 'Select branch',
            choices: [...branchWithDescription, {name:'  Quit', value:''} ]
        }
    ]).then((answers) => {
        return answers.branch;
    }).catch((error) => {
        if (error) {
            console.log(error);
        }
    });

    if(showMode)
    {
        return;
    }

    // Quitが選ばれたとき
    if(!branch)
    {
        return;
    }

    // ブランチ選択可能な処理を選ぶ
    const isCurrentBranch = currentBranch == branch;

    if (argvAction)
    {
        commandsMap[argvAction].action(branch);
    }
    else
    {
        await selectCommand(branch, isCurrentBranch);
    }
}

const execBranchAction = (branchCommand) => {
    return new Promise((resolve, reject) => {
        console.log(branchCommand);
        exec(branchCommand, (error, stdout, stderr) => {
            if (error || stderr) {
                console.log(stderr);
                return resolve();
            }
            return resolve();
        });
    });
}

const execSyncBranchAction = (branchCommand) => {
    return new Promise((resolve, reject) => {
        execSync(branchCommand, { stdio: 'inherit' });
        resolve();
    });
}

async function selectCommand(branch, isCurrentBranch) {
    const commandChoises = commands.map((command) => {
        let cohise = {
            name: command.description,
            value: command.id
        };
        if (isCurrentBranch && command.exceptingCurrentBranch) {
            cohise.disabled = command.disabled;
        }
        return cohise;
    });

    await inquirer.prompt([{
        type: 'list',
        name: 'command',
        message: 'Select command',
        choices: [...commandChoises, {name:'Quit', value:''} ]
    }]).then((answers) => {
        const command = answers.command;
        // Quitが選ばれたとき
        if(!command)
        {
            return;
        }
        commandsMap[command].action(branch);
    });
}

main().then(() => {
    // success!!
}).catch((error) => {
    if (error) {
        console.log(error);
    }
});