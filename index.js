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

async function selectCommand(branch, isCurrentBranch) {
    const checkoutCommand = { name: 'Checkout branch', value: 'git checkout ::branch::' };
    const deleteCommand = { name: 'Delete branch', value: 'git branch -d ::branch::' };
    if (isCurrentBranch) {
        // 現在のブランチはcheckoutもdeleteもできないので選択できないようにする
        checkoutCommand.disabled = `Already on`;
        deleteCommand.disabled = `Cannot delete'`;
    }
    const commandChoises = [
        checkoutCommand,
        { name: 'Edit description', value: 'git branch --edit-description ::branch::' },
        deleteCommand,
        { name: 'Quit', value: '' },
    ]

    await inquirer.prompt([{
        type: 'list',
        name: 'command',
        message: 'Select command',
        choices: commandChoises,
    }]).then((answers) => {
        const command = answers.command.replace('::branch::', branch);
        if (command !== '') {
            execSync(command, { stdio: 'inherit' });
        }
    });
}

main().then(() => {
    // success!!
}).catch((error) => {
    if (error) {
        console.log(error);
    }
});