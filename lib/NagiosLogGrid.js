/* Copyright 2010-2011 Proofpoint, Inc. All rights reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

Ext.define('NagUI.NagiosLogGrid',{
	extend: 'Ext.grid.GridPanel',
	alias: 'widget.nagiosloggrid',
	loadMask: true,
	stateful: false,
	autoLoad: false,
	filterClass:'0',
	columns:[
		{ text: 'Time', dataIndex: 'time',width: 130, renderer: nagiosDateRender },
		{ text: 'State', dataIndex: 'state', width: 60, renderer: nagiosStateRender },
		{ text: 'State Type', dataIndex: 'state_type', width: 80,hidden: true},
		{ text: 'Type', dataIndex: 'type', width: 160,hidden: true},
		{ text: 'Mesg', dataIndex: 'message', hidden:false, flex:2},
		{ text: 'Host', dataIndex: 'host_name',hidden:true},
		{ text: 'LineNo', dataIndex: 'lineno',hidden:true},
		{ text: 'Options', dataIndex: 'options',hidden:true},
		{ text: 'Contact', dataIndex: 'contact_name',hidden:false},
		{ text: 'Service', dataIndex: 'service_description',hidden:true},
		{ text: 'Output', dataIndex: 'plugin_output',hidden:true},
		{ text: 'Attempt', dataIndex: 'attempt', hidden:true},
		{ text: 'Log Class', dataIndex: 'class', hidden:false, renderer:nagiosLogClassRender},
		{ text: 'Command', dataIndex: 'command_name',hidden:true}			
	],
	tbar:[
		'Filter by Log Type: ',
		{
			xtype:'combo',
			value: '0',
			width: 165,
			instance: this,
			store:[
				['0','All'],
				['1','Alert'],
				['2','Program Event'],
				['3','Notification'],
				['4','Passive Check'],
				['5','External Command'],
				['6','Initial/Current State'],
				['7','Program State Change']
			],
			listeners:{
				'expand':function(c){
					c.store.clearFilter();
				},
				// 'change':function(c,nv,ov){
				// 	this.instance.filterClass=nv;
				// 	this.instance.getLogs({class: nv })
				// },
				'select':function(c){
					this.instance.filterClass=c.getValue();
					this.instance.getLogs({class: c.getValue() })
					// c.blur();
					// NagUI.log(c.getValue());
				}
				// ,
				// 'collapse': function(c){
				// 	c.blur();
				// 	NagUI.log(c.getValue());
				// }
			}
		},
		'-',
		{
			xtype: 'button',
			text: 'Logs since ',
			tooltip: 'click to load another 12 hours',
			scope: this,
			handler: function(){
				this.getLogs({time: this.getTime12Back(this.logsSince)});
			}
		}
	],
	initComponent: function(){
		this.store=new Ext.data.JsonStore({
			proxy: new Ext.data.HttpProxy({
	            method: 'GET',
				url: NagUI.url
	        }),
	        sorters:[
		        {
		        	property: 'time',
		        	direction: 'DESC'
		        }
	        ],
			root: '',
			fields: ['type', 'host_name', {name:'message',convert:function(v){
				var l=v.split(';');
				return l[l.length-1];
			}}, 'lineno', 'options', 
				'contact_name', 'service_description', 'plugin_output', 'state', 
				'attempt', 'class', 'state_type', 'time', 'type', 'command_name']
		});
		NagUI.NagiosLogGrid.superclass.initComponent.call(this);
		
		if(this.host_name && this.service_description && this.autoLoad)
		{
			this.getLogs();
		}
	},
	getTime12Back:function(t)
	{
		var dt=new Date();
		var newtime=dt.format('U') - 43200;
		if(t)
		{
			newtime=t-43200;
		}
		return newtime;
	},
	getLogs:function(opt)
	{
		var query_opts={};
		if(this.host_name) query_opts.host_name= this.host_name;
		if(this.service_description) query_opts.service_description = this.service_description;
		query_opts.time= this.logsSince;
		if(this.peer_name) query_opts.peer_name= this.peer_name;
		if(this.class) query_opts.class= this.filterClass;

		Ext.apply(query_opts,opt);
		if(typeof this.logsSince == 'undefined' && typeof query_opts['time'] == 'undefined')
		{
			query_opts['time']=this.getTime12Back();
		}
		NagUI.log(query_opts);
		this.host_name=query_opts['host_name'];
		this.service_description=query_opts['service_description'];
		this.peer_name=query_opts['peer_name'];
		this.logsSince=query_opts['time'];
		this.store.load({
			params: this.makeQuery(query_opts), 
			scope: this,
			addRecords: opt.addRecords || false,
			callback: function() {
				if(this.getDockedComponent(1) && this.getDockedComponent(1).items.items[3])
				{
					this.getDockedComponent(1).items.items[3].setText('Logs since ' + nagiosDateRender(this.logsSince));				
				}
				this.store.sort('time','DESC');
			}
		});
		NagUI.log(this);
	},
	makeQuery: function(opt)
	{
		NagUI.log('make wquery');
		NagUI.log(this);
		NagUI.log(opt);
		if(opt['rawquery'])
		{
			opt['query']=opt['rawquery'];
			return opt;
		}
		var q='GET log';
		q+='|Columns: type host_name message lineno options contact_name service_description plugin_output state attempt class state_type time type command_name';
		//q+='|Filter: class = 1|Filter: class = 6|Or: 2';
		q+= '|Filter: time >= ' + opt['time'];
		if(opt['host_name'])
		{
			q+= '|Filter: host_name = ' + opt['host_name'];			
		}
		if(opt['class'] != '0' && opt['class'])
		{
			q+='|Filter: class = ' + opt['class'];			
		}
		if(typeof opt['service_description'] != 'undefined')
		{
			q+= '|Filter: service_description = ' + opt['service_description'];
		}
		opt['query']=q;
		if(typeof opt['service_type'])
		return opt;
	}
});

function nagiosLogClassRender(value)
{
	var newval=value;
	var lkup={
	 '0':'All',
	 '1':'Alert',
	 '2':'Program Event',
	 '3':'Notification',
	 '4':'Passive Check',
	 '5':'External Command',
	 '6':'Initial/Current State',
	 '7':'Program State Change'
	};
	if(lkup[value]) 
	{
		return lkup[value];
	}
	return newval;
}
