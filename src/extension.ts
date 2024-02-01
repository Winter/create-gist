import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	let disposables = [];

	disposables.push(vscode.commands.registerCommand('create-gist.createGist', () => {
		const text = getSelectionText();

		if (!text || text.length === 0) {
			return;
		}

		const isPublic = vscode.workspace.getConfiguration('create-gist').get<string>('gistVisibility', 'Secret') === 'Public';

		createGistWithConfig(text, isPublic);
	}));

	disposables.push(vscode.commands.registerCommand('create-gist.createPublicGist', () => {
		const text = getSelectionText();

		if (!text || text.length === 0) {
			return;
		}

		createGistWithConfig(text, true);
	}));

	disposables.push(vscode.commands.registerCommand('create-gist.createSecretGist', () => {
		const text = getSelectionText();

		if (!text || text.length === 0) {
			return;
		}

		createGistWithConfig(text, false);
	}));


	context.subscriptions.push(...disposables);
}

function createGistWithConfig(text: string, isPublic: boolean) {
	const config = vscode.workspace.getConfiguration('create-gist');
	const token = config.get<string>('token');

	if (!token) {
		vscode.window.showErrorMessage('No GitHub token found');
		return;
	}

	// Default file name
	let fileName = 'gistfile1.txt';

	if (config.get<boolean>('includeFileName')) {
		const editor = vscode.window.activeTextEditor;

		if (!editor) {
			vscode.window.showErrorMessage('No active editor found');
			return;
		}

		fileName = editor.document.fileName.split('\\').pop() || fileName;
	}

	// Create gist and run through configuration options
	createGist(token, text, isPublic, fileName)
		.then<any>(res => {
			if (res.status === 201) {
				return res.json();
			} 
			
			vscode.window.showErrorMessage(`Error creating Gist: ${res.statusText}`);
		})
		.then(json => {
			const config = vscode.workspace.getConfiguration('create-gist');

			if (config.get<boolean>('copyToClipboard')) {
				vscode.env.clipboard.writeText(json.html_url);
		
				if (config.get<boolean>('showNotification')) {
					vscode.window.showInformationMessage('Url copied to clipboard');
				}
			}
			else if (config.get<boolean>('showNotification')) {
				vscode.window.showInformationMessage('Created Gist');
			}

		})
		.catch(err => {
			vscode.window.showErrorMessage(`Error creating Gist: ${err}`);
		});
}

function createGist(token: string, text: string, isPublic: boolean, fileName: string = 'gistfile1.txt'): Promise<Response> {
	const data = {
		public: isPublic,
		files: {
			[fileName]: {
				content: text
			}
		}
	};

	return fetch('https://api.github.com/gists', {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${token}`
		},
		body: JSON.stringify(data)
	});
}

function getSelectionText(): string | undefined {
	const editor = vscode.window.activeTextEditor;

	if (!editor) {
		vscode.window.showErrorMessage('No active editor found');
		return;
	}

	const selection = editor.selection;

	return editor.document.getText(selection);
}
