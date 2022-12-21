// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
// https://www.npmjs.com/package/axios
// https://github.com/
import {
	AxiosResponse,
	AxiosError
} from 'axios'; 
const axios = require('axios');


const executeOkDecorationType = vscode.window.createTextEditorDecorationType({
	dark: {
		backgroundColor: { id: 'simone.executedBackground' }
	}
});
const executeFailDecorationType = vscode.window.createTextEditorDecorationType({
	dark: {
		backgroundColor: { id: 'simone.executeFailBackground' }
	}
});

//Create output channel
const simoneOut = vscode.window.createOutputChannel("Simone");

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "simone-for-vscode" is now active!');

	let disposable = vscode.commands.registerCommand('simone-for-vscode.eval', () => {
		evalWithAction('eval');
	});
	context.subscriptions.push(disposable);
	let disposable6 = vscode.commands.registerCommand('simone-for-vscode.evalAndInspect', () => {
		evalWithAction('inspect');
	});
	context.subscriptions.push(disposable6);	
}

// This method is called when your extension is deactivated
export function deactivate() {}

function evalWithAction(action: string) {
	let activeEditor = vscode.window.activeTextEditor;
	if (!activeEditor) {
		// not in editor
		return;
	}
	if (activeEditor.document.languageId !== "javascript") {
		// not a Melrose file
		console.log("not a Simone script");
		return;
	}
	// if text is selection then use that
	// else use the line at which the cursor is at
	let text = '';
	let rangeExecuted: vscode.DecorationOptions[] = [];
	let selection = activeEditor.selection;
	if (selection.isEmpty) {
		// no selection, take current line content
		text = activeEditor.document.lineAt(selection.active.line).text;
		const position = activeEditor.selection.active;
		const startPos = position.with(position.line, 0);
		const endPos = position.with(position.line, text.length);
		rangeExecuted.push({ range: new vscode.Range(startPos, endPos) });
	} else {		
		text = activeEditor.document.getText(selection);
		rangeExecuted.push({ range: new vscode.Range(selection.start, selection.end) });
	}
	sendActionWithText(action, selection.end.line, text, rangeExecuted);
}

function sendActionWithText(action: string, line: number, text: string, rangeExecuted: vscode.DecorationOptions[]) {
	var success = true;
	var successResponseData: any = null;
	let activeEditor = vscode.window.activeTextEditor;
	if (!activeEditor) {
		// not in editor
		return;
	}
	axios({
		method: 'post',
		url: 'http://localhost:8888/v1/statements?debug=false&line=' + (line + 1) + '&action=' + action + '&file=' + activeEditor.document.fileName, // line is zero-based
		data: text,
		headers: { 'Content-Type': 'text/plain; charset=UTF-8' }
	}).then((response: AxiosResponse<any>) => {
		if (response.data !== null) {
			successResponseData = response.data;
		}
	}).catch((err: AxiosError<any>) => {
		success = false;
		if (err.response !== undefined) {
			vscode.window.showWarningMessage(err.response.data.message);
			console.error(err.response.data);
		} else {
			vscode.window.showInformationMessage("No response from Simone; did you start it?");
			console.error(err);
		}
	}).finally(() => {
		let isStoppable = false;
		// TODO put this in separate func
		if (successResponseData !== null) {
			isStoppable = successResponseData.stoppable === true; // TODO have better response			
			if (successResponseData.message !== undefined) {
				// debug info				
				if (successResponseData.object !== undefined && successResponseData.object !== null) {
					if (Object.keys(successResponseData.object).length > 0) {
						console.log(successResponseData.object);
					}
				}
			}
		}
		let activeEditor = vscode.window.activeTextEditor;
		if (!activeEditor) {
			// not in editor
			return;
		}
		if (success) {
			if (action === 'inspect') {
				simoneOut.appendLine(successResponseData);
				// console.log(successResponseData);
				// if (successResponseData.object !== undefined && successResponseData.object !== null) {
				// 	if (Object.keys(successResponseData.object).length > 0) {
				// 		console.log(successResponseData.object);
				// 	}
				// }
			}
			if (action === 'eval') {
				activeEditor.setDecorations(executeOkDecorationType, rangeExecuted);
			}
		} else {
			activeEditor.setDecorations(executeFailDecorationType, rangeExecuted);
		}
		// clean up a bit later
		setTimeout(() => {
			let activeEditor = vscode.window.activeTextEditor;
			if (!activeEditor) {
				// not in editor
				return;
			}
			activeEditor.setDecorations(executeOkDecorationType, []);
			activeEditor.setDecorations(executeFailDecorationType, []);
		}, 200);
	});
}
