var app = {
    initialize: function() {
	// INIT
    	// fixes
    	var g_localStorage = null;
    	try{
    		g_localStorage = window.localStorage;
    	}catch(err){
    		alert("Local storage appears to be unavailable.  Session data will not persist.")
    		g_localStorage = {
    				getItem: function(k){
    					return this.k;
    				},
    				setItem: function(k,v){
    					this.k = v;
    				},
    				removeItem: function(k) {
    					delete this.k;
    				}
    		};
    	}
    	
    	// constants and globals
    	var K_COOKIE   = "K_COOKIE";
    	var K_USERNAME = "K_USERNAME";
    	var K_USERID   = "K_USERID";
    	
    	var g_cookie   = g_localStorage.getItem(K_COOKIE)   || null;
    	var g_username = g_localStorage.getItem(K_USERNAME) || null;
    	var g_userID   = g_localStorage.getItem(K_USERID)   || null;
    	
    	var g_lastUpdateTime = 0;
    	
    	
    	// page refs
    	var P_LOGIN    = $('#page-login');
    	var P_STATUS   = $('#page-status');
    	var pages = $('.app');
    	function showPage(page) {
    		pages.hide();
    		page.show();
    		page.trigger('show');
    	}
    	
    	function setEnabled(el, enable) {
    		if (enable) el.removeAttr('disabled');
    		else el.attr('disabled','disabled');
    		return el;
    	}
    	
	// P_LOGIN
    	//P_LOGIN.on('show', function() { $('#input-username').focus(); });
    	
    	// behavior: auto disable / enable login button
    	var bLogin = setEnabled($('#button-login'), false);
    	var loginEnabled = 0;
    	function fLoginEnabledHandler(e, isDefault) {
    		if (isDefault) --loginEnabled;
    		else ++loginEnabled;
    		setEnabled(bLogin, loginEnabled == 2);
    	}
    	
    	// behavior: default text for input fields
    	function defaultBehavior(id, text) {
    		var K_DEFAULT = 'K_DEFAULT';
    		var C_DEFAULT = 'input-default';
    		var el = $(id).on('setdefault', function(e, isDefault) {
    			if (isDefault)
    				el.data(K_DEFAULT,true).val(text).addClass(C_DEFAULT);
    			else
    				el.data(K_DEFAULT,false).val('').removeClass(C_DEFAULT);
    		}).focus(function(){
    			if (el.data(K_DEFAULT))
    				el.trigger('setdefault', false);
    		}).blur(function(){
    			if (el.val() == '')
    				el.trigger('setdefault', true);
    		});
    		el.trigger('setdefault', true);
    		return el;
    	};
    	
    	// configure input fields
    	defaultBehavior('#input-username', 'username').on('setdefault', fLoginEnabledHandler);
    	defaultBehavior('#input-password', 'password').on('setdefault', fLoginEnabledHandler);
    	
    	
    	// submit login data
    	bLogin.click(function() {
    		setEnabled(bLogin, false);
    		
    		// extract and submit login data
    		var tempUsername = $('#input-username').val();
    		var tempPassword = $('#input-password').val();
    		$('#input-password').trigger('setdefault', true); // clear password
    		
    		$.ajax({
    			type: 'POST',
    			url: "http://myconfessor.org/mypage.php?action=login",
    			dataType: 'text',
    			data: {
    				jsoncreds: JSON.stringify({
    					username: tempUsername,
    					password: tempPassword
    				})
    			}
    		}).done(function(text, status, jqxhr) {
    			try {
    				var data = JSON.parse(text);
    			} catch (e) {
    				alert("Whoops! The server seems to have a problem.\n\nTechno-babble: [tx]\n" + text);
    				return;
    			}
    			
    			if (data.sessionStatus == 0) {
    				//TODO: display error inline
    				alert("Sorry, the username or password you entered is incorrect.")
    				
    			} else if (data.sessionStatus == 1) {
    				// proceed with login
    				g_localStorage.setItem(K_COOKIE  , g_cookie = jqxhr.getResponseHeader('Set-Cookie'));
    				g_localStorage.setItem(K_USERNAME, g_username = data.username);
    				g_localStorage.setItem(K_USERID,   g_userID = data.userID);
    				
    				// set up status page
    				EL_STATUS.text(data.notes || "-- no status set --");
    				EL_INOUT.removeClass('in out').addClass(
    						data.status == "Father is IN"  ? "in"  :
    						data.status == "Father is OUT" ? "out" : ''
    				);
    				g_lastUpdateTime = Date.now();
    				showPage(P_STATUS);
    				
    			} else {
    				alert("Whoops! The server seems to have a problem.\n\nTechno-babble: [ty]\n" + text);
    				return;
    			}
    		}).fail(function(jqxhr, status, error) {
    			EL_STATUS.text('ERROR: ' + status + ' ' + error);
    			alert("Whoops! The server seems to have a problem.\n\nTechno-babble: [tz] [" + status + "]\n" + error)
    		});
    		
    	});
    	
    	
	// P_STATUS
    	var elInputIn = $('#input-in');
    	var elInputOut = $('#input-out');
    	var elInputStatus = $('#input-status');
    	var bUpdateStatus = $('#button-updatestatus');
    	var bLogout = $('#button-logout');
    	
    	// logout
    	bLogout.click(function() {
    		g_cookie = null;
    		g_localStorage.removeItem(K_COOKIE);
    		g_username = null;
    		g_localStorage.removeItem(K_USERNAME);
    		g_userID = null;
    		g_localStorage.removeItem(K_USERID);
			showPage(P_LOGIN);
    	});
    	
    	bUpdateStatus.click(function(){
    		setEnabled(bUpdateStatus, false);
    		
    		// submit status data
    		$.ajax({
    			type: 'POST',
    			url: "http://myconfessor.org/mypage.php?action=update",
    			dataType: 'text',
    			data: {
    				jsonupdate: JSON.stringify({
    					userID: g_userID,
    					notes: elInputStatus.val(),
    					status: elInputIn.prop('checked') ? "Father is IN" : "Father is OUT"
    				})
    			}
    		}).done(function(text, status, jqxhr) {
    			try {
    				var data = JSON.parse(text);
    			} catch (e) {
    				alert("Whoops! The server seems to have a problem.\n\nTechno-babble: [vx]\n" + text);
    				return;
    			}
    			
    			if (data.sessionStatus == 0) {
    				alert("Your session has expired. Please log in again.")
    				show_page(P_LOGIN);
    				return;
    				
    			} else if (data.sessionStatus == 1) {
    				//if (data.message == "") {
	    				// update status page
	    				EL_STATUS.text(data.notes || "-- no status set --");
	    				EL_INOUT.removeClass('in out').addClass(
	    						data.status == "Father is IN"  ? "in"  :
	    						data.status == "Father is OUT" ? "out" : ''
	    				);
	    				(data.status == "Father is IN" ? elInputIn : elInputOut).prop('checked', 'checked');
	    				g_lastUpdateTime = Date.now();
    				//} else {
    				//	alert(data.message);
    				//}
    				
    			} else {
    				alert("Whoops! The server seems to have a problem.\n\nTechno-babble: [vy]\n" + text);
    			}
    			
    		}).fail(function(jqxhr, status, error) {
    			EL_STATUS.text('ERROR: ' + status + ' ' + error);
    			alert("Whoops! The server seems to have a problem.\n\nTechno-babble: [vz] [" + status + "]\n" + error)
    			
    		}).always(function() {
    			setEnabled(bUpdateStatus, true);
    		});
    		
    	});
    	
    	var EL_INOUT = $('#text-inout');
    	var EL_DATE = $('#text-date');
    	var EL_STATUS = $('#text-status');
    	P_STATUS.on('show', function() {
    		
    		if (!(g_cookie && g_username && g_userID)) {
    			// ensure we've properly logged in...
        		g_cookie = null;
        		g_localStorage.removeItem(K_COOKIE);
        		g_username = null;
        		g_localStorage.removeItem(K_USERNAME);
        		g_userID = null;
        		g_localStorage.removeItem(K_USERID);
    			setTimeout(function() { showPage(P_LOGIN); }, 0);
    			return;
    		}
    		
    		// set page update timer
    		function f_doUpdate() {
    			// only update if it's been a while
				if (Date.now() - g_lastUpdateTime > 60000*15) {
					$.ajax({
		    			url: "http://www.myconfessor.org/app_info.php?userName=" + g_username,
		    			dataType: 'text'
		    		}).done(function(text) {
		    			try {
							var data = JSON.parse(text.replace(/{[^}]*}/,''))[0];
		    			} catch (e) {
		    				setTimeout(f_doUpdate, 60000*30);
		    				alert("Whoops! The server seems to have a problem.\n\nTechno-babble: [ux]\n" + e + "\n" + text);
		    				return;
		    			}
		    			
	    				setTimeout(f_doUpdate, 60000*15);
		    			
	    				// update display
		    			EL_STATUS.text(data.notes || "-- no status set --");
		    			EL_INOUT.removeClass('in out').addClass(
		    					data.status == "Father is IN"  ? "in"  :
		    					data.status == "Father is OUT" ? "out" : ''
		    			);
		    			(data.status == "Father is IN" ? elInputIn : elInputOut).prop('checked', 'checked');
		    			g_lastUpdateTime = Date.now();
		    			
		    		}).fail(function(jqxhr, status, error) {
						setTimeout(f_doUpdate, 60000*30);
		    			EL_STATUS.text('ERROR: ' + status + ' ' + error);
		    			alert("Whoops! The server seems to have a problem.\n\nTechno-babble: [uz] [" + status + "]\n" + error)
		    		});
				} else {
					setTimeout(f_doUpdate, 60000*10);
				}
    		};
    		f_doUpdate();
    	});
    	
    	
	// INIT
    	// show login page
    	showPage( g_cookie ? P_STATUS : P_LOGIN);
    }
};
