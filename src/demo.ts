
import { html, raw } from 'hono/html'
export const Demo = raw`
<html lang="zh-CN">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>文件上传示例</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
        }

        h1 {
            color: #333;
            text-align: center;
        }

        .upload-container {
            border: 2px dashed #ccc;
            border-radius: 10px;
            padding: 20px;
            text-align: center;
            margin: 20px 0;
            background-color: #f9f9f9;
        }

        .btn {
            background-color: #4285f4;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin-top: 10px;
        }

        .btn:hover {
            background-color: #3367d6;
        }

        #result {
            margin-top: 20px;
            padding: 15px;
            border-radius: 5px;
            display: none;
        }

        .success {
            background-color: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
        }

        .error {
            background-color: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
        }

        #fileUrl {
            word-break: break-all;
        }

        code {
            background: #f0f0f0;
            padding: 2px 4px;
            border-radius: 3px;
        }
    </style>
</head>

<body>
    <h1>文件上传示例</h1>

    <div class="upload-container">
        <h2>上传文件</h2>
        <form id="uploadForm">
            <input type="file" id="fileInput" name="file" required>
            <br>
            <button type="submit" class="btn">上传</button>
        </form>
    </div>

    <div id="result">
        <h3>上传结果</h3>
        <p id="message"></p>
        <p>文件URL: <a id="fileUrl" href="#" target="_blank"></a></p>
    </div>

    <div>
        <h2>API 使用说明</h2>
        <h3>上传文件</h3>
        <p>POST 请求到当前地址，使用 multipart/form-data 格式，文件字段名为 "file"</p>
        <pre><code>
// 使用 fetch API 上传
const formData = new FormData();
formData.append('file', fileObject);

fetch('/', {
  method: 'POST',
  body: formData
})
.then(response => response.json())
.then(data => console.log('文件URL:', data.url));
    </code></pre>
    </div>

    <script>
        document.getElementById('uploadForm').addEventListener('submit', async (e) => {
            e.preventDefault();

            const fileInput = document.getElementById('fileInput');
            const resultDiv = document.getElementById('result');
            const messageEl = document.getElementById('message');
            const fileUrlEl = document.getElementById('fileUrl');

            if (!fileInput.files[0]) {
                resultDiv.className = 'error';
                messageEl.textContent = '请选择文件';
                resultDiv.style.display = 'block';
                return;
            }

            const formData = new FormData();
            formData.append('file', fileInput.files[0]);

            try {
                const response = await fetch('/', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();

                if (data.success) {
                    resultDiv.className = 'success';
                    messageEl.textContent = '文件上传成功!';
                    fileUrlEl.textContent = data.url;
                    fileUrlEl.href = data.url;
                    resultDiv.style.display = 'block';
                } else {
                    resultDiv.className = 'error';
                    messageEl.textContent = '上传失败: ' + (data.message || '未知错误');
                    resultDiv.style.display = 'block';
                }
            } catch (error) {
                resultDiv.className = 'error';
                messageEl.textContent = '上传出错: ' + error.message;
                resultDiv.style.display = 'block';
            }
        });
    </script>
</body>

</html>
`