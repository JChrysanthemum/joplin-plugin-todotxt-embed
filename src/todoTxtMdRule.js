const TodoTxt = require('todotxt-parser-js');


function renderTask(state, task) {
	var tokens = [];
	const todo = task.todo;

	const inputToken = Object.assign(new state.Token('checkbox_input', 'input', 0),
								{attrs: [['type','checkbox']]});
	if (todo.isCompleted()) { inputToken.attrs.push(["checked", "checked"])}
	tokens = tokens.concat([
							Object.assign(new state.Token('label_open', 'label', 1), 
								{attrs:[['class','todo-checkbox']]}),
							inputToken,
							Object.assign(new state.Token('span_open', 'span', 1), 
								{attrs:[['class','todo-checkmark']]}),
							new state.Token('span_close', 'span', -1),
							new state.Token('label_close', 'label', -1)
						]);

	// var html = ` <span class="todo-priority">${todo.getPriority('~')}</span>`;
	const priority = todo.getPriority('~');
	var options  = ['A','B','C','D','E','~'];
	if (options.includes(priority) === false){
		options = ['A','B','C','D','E', priority, '~']
	}
	tokens.push(Object.assign(new state.Token('div_open', 'div', 1), 
								{attrs:[['class','todo-priority']]}));
	tokens.push(Object.assign(new state.Token('select_open', 'select', 1), 
								{attrs:[['name', 'priority']]}));
	options.forEach(function(option){
		let token = new state.Token('option_open', 'option', 1);
		token.attrs = [['value', option]];
		if (priority==option) { token.attrs.push(['selected', 'selected']);}
		tokens.push(token);
		tokens.push(Object.assign(new state.Token('html_inline', '', 0), {content: option}));
		tokens.push(new state.Token('option_close', 'option', -1));

	})
	tokens.push(new state.Token('select_close', 'select', -1))
	tokens.push(new state.Token('div_close', 'div', -1))

	var html = '';

	const items = todo.getBodyTokens();
	for (var i=0; i<items.length; i++){
		const item = items[i];
		switch (item["type"]){
			case "project":
				html = html + ` <span class="todo-project">${item["content"]}</span>`;
				break;
			case "context":
				html = html + ` <span class="todo-context">${item["content"]}</span>`;
				break;
			case "meta":
				html = html + ` <span class="todo-meta">${item["content"]}</span>`;
				break;
			default:
				html = html + ` ${item["content"]}`;
		}
	}
	tokens.push(Object.assign(new state.Token('inline', '', 0), {content: html, children: []}))

	tokens.push(Object.assign(new state.Token('span_open', 'span', 1), 
								{attrs:[['class','todo-panel']]}));
	html  = `<span class="todo-completion">${todo.getCompletionDate() || ' '}</span> `;
	html += `<span class="todo-creation">${todo.getCreationDate() || ' '}</span> `;
	html += `<a class="todo-select" href="#">Select</a>`
	tokens.push(Object.assign(new state.Token('inline', '', 0), {content: html, children: []}));
	tokens.push(new state.Token('span_close', 'span', -1));

	return tokens;
}

function todoTxtMd(state, startLine, endLine, silent) {
	var tokens = state.tokens;
	for (let idx = 0; idx < tokens.length; idx++) {
		const token = tokens[idx]
		if (token.type !== 'fence') { continue; }
		if (token.info.length < 7) { continue; }

		const params = token.info.trim().split(' ');
		const plate  = params.shift();
		if ( plate !== 'todotxt' && plate !== 'archive-todotxt') { continue; }

		const listLineIdx = token.map[0];

		var sortOptions = [];
		var filterOptions = [];
		for (var i=0; i<params.length; i++){
			const query = params[i];
			const args  = query.split(':');

			switch (args.shift()){
				case 'sort':
					if (args.length < 1 || args[0].length < 1) { continue; }
					sortOptions.push(args);
					break;

				case 'filter':
					if (args.length < 1 || args[0].length < 1) { continue; }
					var option = [args.shift()];
					if (args.length < 1 || args[0].length < 1) { continue; }
					option.push(args.shift().split(','));
					if (args.length > 0 ) { option.push(args.shift()); }
					filterOptions.push(option)
					break;

				default:
					break;
			}
		}

		const lines = token.content.split('\n');
		if ( lines[lines.length-1].search("```")>=0 ) { lines.pop(); }

		const todoTxt   = TodoTxt.parse(lines.join('\n'));
		const todoView  = todoTxt.getTodoView();
		const queryView = todoView.filter(filterOptions, true).sort(sortOptions);
		const countedProjects = queryView.getCountedProjects();
		const countedContexts = queryView.getCountedContexts();

		todoTokens = [];
		todoTokens.push(Object.assign(new state.Token('bullet_list_open', 'ul', 1), {block: true, attrs: [['class','todotxt']]}));

		// Render TodoTxt Header
		var headerHtml  = `<b>Sort</b>: ${sortOptions.join(' ')} `
						+ `<b>Filter</b>: ${filterOptions.join(' ')} `
						+ `<b>Show</b>: ${queryView.count('notcompleted')}/${todoView.count('notcompleted')} OPEN ${queryView.count()}/${todoView.count()} ALL `;

		headerHtml += '<b>Projects</b>: ';
		Object.keys(countedProjects).sort().forEach(key => {
			headerHtml += `<span class="todo-project">${key}</span><span class="todo-count">${countedProjects[key]}</span> `;
		})
		headerHtml += '<b>Contexts</b>: ';
		Object.keys(countedContexts).sort().forEach(key => {
			headerHtml += `<span class="todo-context">${key}</span><span class="todo-count">${countedContexts[key]}</span> `;
		})

		// Add the clear button
		headerHtml += `<br><a class="todo-clear" href="#">[Clear done ?]</a>`

		// Add clear confirm button v1
		// Checkbox appears but no label or id
		// headercheck = `<label class="todo-clearcheckbox"><input type="checkbox">N</label>`

		// Add clear confirm button v2
		// Checkbox not appears
		// headercheck = tokens.concat([
		// 						Object.assign(new state.Token('label_open', 'label', 1), 
		// 							{attrs:[['class','todo-clearcheckbox']]}),
		// 						Object.assign(new state.Token('checkbox_input', 'input', 0),
		// 							{attrs: [['type','checkbox']]}),
		// 						// Object.assign(new state.Token('span_open', 'span', 1), 
		// 						// 	{attrs:[['class','todo-checkmark']]}),
		// 						// new state.Token('span_close', 'span', -1),
		// 						new state.Token('label_close', 'label', -1)
		// 					]);

		// Add clear confirm button v3
		// Button to fix
		headerHtml += `<a class="todo-clear-dummycheck" href="#">[N]</a>`



		todoTokens.push(Object.assign(new state.Token('list_item_open', 'li', 1), {block: true, attrs: [["class","todotxt-header"]]}));
		todoTokens.push(Object.assign(new state.Token('inline', '', 0), {content: headerHtml, children: []}));

		// Add token for clear confirm button v1
		// todoTokens.push(Object.assign(new state.Token('checkbox_input', 'input', 0),{attrs: [['type','checkbox']]}, {content: headercheck, children: []}));

		// Add token for clear confirm button v2
		// todoTokens = todoTokens.concat(headercheck);

		todoTokens.push(Object.assign(new state.Token('list_item_open', 'li', -1), {block: true}));

		Object.assign(new state.Token('checkbox_input', 'input', 0),
								{attrs: [['type','checkbox']]})

		// Render Todo items
		const tasks = queryView.getList();
		for (var i=0; i<tasks.length; i++){
			const task     = tasks[i];
			const lineIdx  = listLineIdx + 1 + task["lineIdx"];
			const priority = `prior-${task.todo.getPriority("null")}`;

			todoTokens.push(Object.assign(new state.Token('list_item_open', 'li', 1), 
				{block: true, attrs: [["class",`todo ${priority}`],["data-lineIdx",lineIdx]]}));
			todoTokens = todoTokens.concat(renderTask(state, task));
			todoTokens.push(Object.assign(new state.Token('list_item_open', 'li', -1), {block: true}));
		}
		todoTokens.push(Object.assign(new state.Token('bullet_list_close', 'ul', -1), {block: true}));
		tokens = tokens.slice(0,idx).concat(todoTokens,tokens.slice(idx+1));
		idx = idx + todoTokens.length - 1;
	}
	state.tokens = tokens;
}


module.exports = {
	default: function(context) {
		return {
			plugin: function (markdownIt, _options) {
				const pluginId = context.pluginId;
				markdownIt.core.ruler.after('block', 'todoTxt', todoTxtMd);
			},
			assets: function () {
				return [
					{ name: 'todoTxtMdView.js' },
					{ name: 'todoTxtMdView.css'},]
			}
		}
	}
}