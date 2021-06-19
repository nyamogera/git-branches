#! /usr/bin/env node

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
const execGetBranchDescription = (branch, isCurrent) => {
    return new Promise((resolve, reject) => {
        exec(`git config branch.${branch}.description`, (error, stdout, stderr) => {
            const mark = (isCurrent ? '* ' : '  ');
            if (error || stderr) {
                // `git config branch.${branch}.description`の中身がない場合はエラーがでるので無視してすすめる
                return resolve({ name: mark + branch, value: branch });
            }
            return resolve({
                name: `${mark}${branch} : ${stdout.trim()}`,
                value: branch
            });
        })
    })
}

async function main() {

    const branches = await execGetBranches();
    const currentBranch = branches.current;
    const branchWithDescription = await Promise.all(branches.list.map(branch => execGetBranchDescription(branch, branch === currentBranch)));

    // ブランチ名を選択する
    const branch = await inquirer.prompt([
        {
            type: 'list',
            name: 'branch',
            message: 'Select branch',
            choices: branchWithDescription
        }
    ]).then((answers) => {
        return answers.branch;
    }).catch((error) => {
        if (error) {
            console.log(error);
        }
    });

    // ブランチ選択可能な処理を選ぶ
    const isCurrentBranch = currentBranch == branch;
    
    await selectCommand(branch, isCurrentBranch);

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
        const result = execSync(branchCommand, { stdio: 'inherit' });
        console.log(result.toString());
        resolve();
    });
}

const emptyAction = (command) => {
    return new Promise((resolve, reject) => {
        resolve();
    });
}

const commands = [
    { id: 'checkout', description: 'Checkout branch', action: (branch) => { execBranchAction(`git checkout ${branch}`); }, exceptingCurrentBranch: true, disabled: `Already on` },
    { id: 'edit', description: 'Edit description', action: (branch) => { execSyncBranchAction(`git branch --edit-description ${branch}`); }, exceptingCurrentBranch: false },
    { id: 'delete', description: 'Delete branch', action: (branch) => { execBranchAction(`git branch -d ${branch}`); }, exceptingCurrentBranch: true, disabled: `Cannot delete` },
    { id: 'quit', description: 'Quit', action: (branch) => { emptyAction(''); }, exceptingCurrentBranch: false }
];

const commandsMap = commands.reduce((map, command) => {
    map[command.id] = command;
    return map;
}, {});


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
        choices: commandChoises,
    }]).then((answers) => {
        const command = answers.command;
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