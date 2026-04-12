# webar-project

花のAR表示テスト

## 🚀 使い方

### 基本的なアクセス方法

URLのパラメータで表示する3Dモデルを指定します。

```
http://localhost:8000/?model=flower  → 花を表示
http://localhost:8000/?model=dog     → 犬を表示
http://localhost:8000/?model=cat     → 猫を表示
```

### デフォルト動作

URLにパラメータがない場合、`flower` が自動的に使用されます。

```
http://localhost:8000/
↓
?model=flower がデフォルトで適用される
```

## 📁 ファイル構成

```
webar-project/
├── README.md
├── index.html              ← このファイルを使用
├── models/                 ← 3Dモデルの格納場所
│   └── flower.glb
└── markers/                ← マーカーパターンの格納場所
    └── pattern-flower.patt
```

## ➕ 新しいモデルを追加する方法

1. **3Dモデルファイルを準備**（例：`dog.glb`）を `models/` に入れる
2. **マーカーファイルを準備**（例：`pattern-dog.patt`）を `markers/` に入れる
3. URLで指定：`index.html?model=dog`

### 名前付けの規則

| 内容 | 例 |
|------|-----|
| 3Dモデル | `models/dog.glb` |
| マーカー | `markers/pattern-dog.patt` |
| URL | `?model=dog` |

> ⚠️ 3Dモデルとマーカーの名前は**必ず同じ**にしてください。

## 🔧 技術仕様

### URLパラメータの仕組み

```javascript
// URL: index.html?model=flower
const params = new URLSearchParams(window.location.search);
const model = params.get('model') || 'flower';  // 'flower' を取得

// パスが自動生成される
./models/flower.glb           ← 3Dモデル
./markers/pattern-flower.patt ← マーカー
```

## 📝 よくある質問

**Q. HTMLを編集する必要がありますか？**
A. いいえ。ファイルを `models/` と `markers/` に追加するだけです。

**Q. 複数のモデルを同時に表示できますか？**
A. 現在は1つのモデルのみ対応しています。

**Q. マーカーファイルの形式は？**
A. `.patt` ファイル（AR.js 標準形式）を使用します。
