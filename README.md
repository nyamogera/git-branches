# git-branch

Gitのブランチ操作をほんのすこしだけ楽にするツールです

# Demo
![](./images/hamster-paradise.gif)

# Usage
インストール
ターミナルやPowerShellで以下のコマンドを入力します
```
npm install -g https://github.com/nyamogera/git-branches
```

### Usage
ターミナルやPowerShellで以下のコマンドを入力します
```
git-branches
```

* オプションとして、以下のコマンドを入力できます
  - 動作(いずれの1つのみ指定可能)
    - --edit     ブランチ説明を編集する
    - --checkout 
    - --delete
  - ブランチの指定
    - --current カレントブランチを初期で選択し、ブランチの選択を省略します

▼ 例)以下のようにコマンドを入力すると、ブランチの選択後そのままブランチをチェックアウトします
```
git-branches --checkout
```

▼ 例)以下のようにコマンドを入力すると、ブランチの選択なしに、ブランチの説明編集画面へ移行します。
```
git-branches --current --edit
```