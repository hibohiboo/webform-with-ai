# spec-kitの導入。
```bash
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git
```

`specify-cli==0.0.22`をインストール。

```bash
specify init .
specify check
```

specify checkの結果。 ready
![](image/check.png)

# claude で作業開始
今回はpowershellで起動
```
claude
```

## プロジェクト憲法を書く

```
/speckit.constitution 可読性を重視する。 テストは必須。 シンプルな設計を優先し、過剰な抽象化は避ける。 ユーザー体験を第一に考える。
```
