# PC Frontier Lab

2015年に小さなPCハードウェア会社を設立し、CPU・GPU・完成PCを研究、設計、試作、発売して成長するThree.js製の経営シミュレーションです。

## 実装済み

- CPU・GPU・完成PCの企画と詳細設計
- 製品ごとの主要6項目と、研究レベルに連動する設計可能範囲
- 性能、消費電力、温度、騒音、品質、歩留まり、原価の計算
- 用途別ベンチマーク予測、競合比較、ボトルネック理由表示
- 2015年以降の代表的な実在市場パーツ
- 2027年以降の架空競合パーツによる将来市場
- 実在・架空市場パーツを組み込める完成PC構成
- CPUソケット、メモリ規格、電源容量の互換性判定
- 社員6職種、採用、研修、能力による4段階の開発進行
- 1設計から上位、標準、省電力、歩留まり活用SKUを展開
- 媒体別レビュー、週次販売、利益、返品、ブランド成長
- BIOS・ドライバー更新、値下げ、保証延長、終売
- 市場イベントと2015年から未来への年次進行
- Three.jsによるCPU・GPU・完成PCショールーム
- localStorage自動セーブ

企画の基準は [`GAME_DESIGN.md`](./GAME_DESIGN.md) にあります。

## ローカル起動

```bash
npm install
npm run dev
```

Wranglerを使わず確認する場合は、`public` を任意のHTTPサーバーで配信してください。

## Cloudflare Workersで公開

このリポジトリはWorkers Static Assets用です。GitHub Actionsは使用しません。

Cloudflare側でGitHubリポジトリ `bata-san/depy` を接続し、次のように設定します。

- Production branch: `main`
- Root directory: `/`
- Build command: 空欄
- Deploy command: `npx wrangler deploy`

`wrangler.jsonc` の `assets.directory` は `./public`、未一致のナビゲーションは `index.html` へ戻すSPA設定です。

## 外部ライブラリ

Three.js `0.128.0` とOrbitControlsをjsDelivrから読み込みます。ゲーム本体、状態、データはリポジトリ内の静的ファイルです。

## 市場データについて

実在製品名は年代感、比較、完成PCへの組み込みを表現するために使用しています。価格、性能、品質、供給量はゲームバランス用の正規化値で、実測値や現在価格を保証するものではありません。2027年以降は明示的な架空製品です。商標は各権利者に帰属し、本作との提携を示すものではありません。
