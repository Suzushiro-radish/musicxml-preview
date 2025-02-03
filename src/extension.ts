import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("musicxmlPreview.show", () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("MusicXML ファイルを開いてください");
        return;
      }

      const document = editor.document;
      if (document.languageId !== "xml" || !document.fileName.endsWith(".musicxml")) {
        vscode.window.showErrorMessage("MusicXML ファイルではありません");
        return;
      }

      const panel = vscode.window.createWebviewPanel(
        "musicxmlPreview", // 内部識別子
        "MusicXML プレビュー", // タイトル
        vscode.ViewColumn.Beside, // エディタの右側に表示
        {
          enableScripts: true, // Webview内でJSを実行できるようにする
          retainContextWhenHidden: true // 非表示時も状態を保持
        }
      );

      // 初回表示
      panel.webview.html = getWebviewContent(document.getText());

      // ファイルが変更されたら、プレビューを更新
      const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document.uri.toString() === document.uri.toString()) {
          panel.webview.postMessage({ type: "update", content: event.document.getText() });
        }
      });

      panel.onDidDispose(() => {
        changeDocumentSubscription.dispose();
      });
    })
  );
}

function getWebviewContent(musicXmlContent: string): string {
  return /*html*/ `
  <!DOCTYPE html>
  <html lang="ja">
  <head>
    <meta charset="utf-8">
    <script src="https://cdn.jsdelivr.net/npm/opensheetmusicdisplay@1.6.1/build/opensheetmusicdisplay.min.js"></script>
    <style>
      body {
        margin: 0;
        padding: 10px;
        overflow: auto;
		background-color: #f0f0f0;
      }
      #preview {
        width: 100%;
        height: 100vh;
      }
    </style>
  </head>
  <body>
    <div id="preview"></div>
    <script>
      const osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay("preview", { autoResize: true });

      async function renderMusicXML(xmlString) {
        try {
          await osmd.load(xmlString);
          osmd.render();
        } catch (error) {
          console.error("Error rendering MusicXML:", error);
          document.getElementById("preview").innerHTML = "<p>Failed to render MusicXML</p>";
        }
      }

      // VSCodeからデータを受信する
      window.addEventListener("message", (event) => {
        if (event.data.type === "update") {
          renderMusicXML(event.data.content);
        }
      });

      // 初回レンダリング
      renderMusicXML(${JSON.stringify(musicXmlContent)});
    </script>
  </body>
  </html>
  `;
}

export function deactivate() {}