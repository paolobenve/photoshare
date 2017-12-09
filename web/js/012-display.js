var Options = {};
var isMobile = {
	Android: function() {
		return navigator.userAgent.match(/Android/i);
	},
	BlackBerry: function() {
		return navigator.userAgent.match(/BlackBerry/i);
	},
	iOS: function() {
		return navigator.userAgent.match(/iPhone|iPad|iPod/i);
	},
	Opera: function() {
		return navigator.userAgent.match(/Opera Mini/i);
	},
	Windows: function() {
		return navigator.userAgent.match(/IEMobile/i);
	},
	any: function() {
		return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows());
	}
};
// this variable permits to take into account the real mobile device pixels when deciding the size of reduced size image which is going to be loaded
var screenRatio = window.devicePixelRatio || 1;

$(document).ready(function() {

	/*
	 * The display is not yet object oriented. It's procedural code
	 * broken off into functions. It makes use of libphotofloat's
	 * PhotoFloat class for the network and management logic.
	 *
	 * All of this could potentially be object oriented, but presently
	 * it should be pretty readable and sufficient. The only thing to
	 * perhaps change in the future would be to consolidate calls to
	 * jQuery selectors. And perhaps it'd be nice to move variable
	 * declarations to the top, to stress that JavaScript scope is
	 * for an entire function and always hoisted.
	 *
	 * None of the globals here polutes the global scope, as everything
	 * is enclosed in an anonymous function.
	 *
	 */

	/* Globals */

	var currentAlbum = null;
	var currentMedia = null;
	var currentMediaIndex = -1;
	var previousAlbum = null;
	var previousMedia = null;
	var nextMedia = null;
	var photoFloat = new PhotoFloat();
	var maxSize;
	var fullScreenStatus = false;
	var photoSrc, videoSrc;
	var language;
	var byDateRegex;
	var byGpsRegex;
	var numSubAlbumsReady;
	var fromEscKey = false;
	var firstEscKey = true;
	var nextLink = "", prevLink = "", albumLink = "", mediaLink = "";
		// set the map zooms for country, region, place, and photo
		// they have been chosen in order to fit to Europe distances

	/* Displays */

	function _t(id) {
		language = getLanguage();
		return translations[language][id];
	}

	function translate() {
		language = getLanguage();
		var selector;
		for (var key in translations[language]) {
			if (translations[language].hasOwnProperty(key)) {
				if (key == '#title-string' && document.title.substr(0, 5) != "<?php")
					// don't set page title, php has already set it
					continue;
				selector = $(key);
				if (selector.length) {
					selector.html(translations[language][key]);
				}
			}
		}
	}

	function getLanguage() {
		language = "en";
		if (Options.language && translations[Options.language] !== undefined)
			language = Options.language;
		else {
			var userLang = navigator.language || navigator.userLanguage || navigator.browserLanguage || navigator.systemLanguage;
			language = userLang.split('-')[0];
		}
		return language;
	}

	// adapted from https://stackoverflow.com/questions/15084675/how-to-implement-swipe-gestures-for-mobile-devices#answer-27115070
	function detectSwipe(el,callback) {
		var swipe_det, ele, min_x, min_y, max_x, max_y, direc;
		var touchStart, touchMove, touchEnd;
		touchStart = function(e) {
			var t = e.touches[0];
			swipe_det.sX = t.screenX;
			swipe_det.sY = t.screenY;
		};
		touchMove = function(e) {
			e.preventDefault();
			var t = e.touches[0];
			swipe_det.eX = t.screenX;
			swipe_det.eY = t.screenY;
		};
		touchEnd = function(e) {
			//horizontal detection
			if (
				(swipe_det.eX - min_x > swipe_det.sX || swipe_det.eX + min_x < swipe_det.sX) &&
				swipe_det.eY < swipe_det.sY + max_y &&
				swipe_det.sY > swipe_det.eY - max_y &&
				swipe_det.eX > 0
			) {
				if(swipe_det.eX > swipe_det.sX)
					direc = "r";
				else
					direc = "l";
			}
			//vertical detection
			else if (
				(swipe_det.eY - min_y > swipe_det.sY || swipe_det.eY + min_y < swipe_det.sY) &&
				swipe_det.eX < swipe_det.sX + max_x &&
				swipe_det.sX > swipe_det.eX - max_x &&
				swipe_det.eY > 0
			) {
				if(swipe_det.eY > swipe_det.sY)
					direc = "d";
				else
					direc = "u";
			}

			if (direc != "") {
				if(typeof callback == 'function')
					callback(el,direc);
			}
			direc = "";
			swipe_det.sX = 0;
			swipe_det.eX = 0;
		};
		swipe_det = {};
		swipe_det.sX = 0; swipe_det.eX = 0;
		min_x = 30;  //min x swipe for horizontal swipe
		max_x = 30;  //max x difference for vertical swipe
		min_y = 50;  //min y swipe for vertical swipe
		max_y = 60;  //max y difference for horizontal swipe
		direc = "";
		ele = document.getElementById(el);
		ele.addEventListener('touchstart', touchStart, false);
		ele.addEventListener('touchmove', touchMove, false);
		ele.addEventListener('touchend', touchEnd, false);
	}

	function swipe(el,d) {
		if (d == "r") {
			swipeRight(prevLink);
		} else if (d == "l") {
			swipeLeft(nextLink);
		} else if (d == "d") {
			if (albumLink) {
				fromEscKey = true;
				swipeDown(albumLink);
			}
		} else if (d == "u") {
			if (currentMedia === null)
				swipeUp(mediaLink);
			else
				swipeLeft(nextLink);
		}
	}

	function swipeRight(dest) {
		if (dest) {
			$("#media-box-inner").stop().animate({
				right: "-=" + window.innerWidth,
			}, 300, function() {
				location.href = dest;
				$("#media-box-inner").css('right', "");
			});
		}
	}
	function swipeLeft(dest) {
		if (dest) {
			$("#media-box-inner").stop().animate({
				left: "-=" + window.innerWidth,
			}, 300, function() {
				location.href = dest;
				$("#media-box-inner").css('left', "");
			});
		}
	}

	function swipeUp(dest) {
		if (dest) {
			$("#media-box-inner").stop().animate({
				top: "-=" + window.innerHeight,
			}, 300, function() {
				location.href = dest;
				$("#media-box-inner").css('top', "");
			});
		}
	}
	function swipeDown(dest) {
		if (dest) {
			$("#media-box-inner").stop().animate({
				top: "+=" + window.innerHeight,
			}, 300, function() {
				location.href = dest;
				$("#media-box-inner").css('top', "");
			});
		}
	}

	function socialButtons() {
		var url, hash, myShareUrl = "";
		var mediaParameter;
		var folders, myShareText, myShareTextAdd;

		if (! isMobile.any()) {
			$(".ssk-whatsapp").hide();
		} else {
			// with touchscreens luminosity on hover cannot be used
			$(".album-button-and-caption").css("opacity", 1);
			$(".thumb-container").css("opacity", 1);
			$(".album-button-random-media-link").css("opacity", 1);

		}


		url = location.protocol + "//" + location.host;
		folders = location.pathname;
		folders = folders.substring(0, folders.lastIndexOf('/'));
		url += folders;
		if (currentMedia === null) {
			mediaParameter = PhotoFloat.pathJoin([
				Options.server_cache_path,
				Options.cache_album_subdir,
				currentAlbum.cacheBase
				]) + ".jpg";
		} else {
			var reducedSizesIndex = 1;
			if (Options.reduced_sizes.length == 1)
				reducedSizesIndex = 0;
			var prefix = removeFolderMarker(currentMedia.foldersCacheBase);
			if (prefix)
				prefix += Options.cache_folder_separator;
			if (currentMedia.mediaType == "video") {
				mediaParameter = PhotoFloat.pathJoin([
					Options.server_cache_path,
					currentMedia.cacheSubdir,
					]) + prefix + currentMedia.cacheBase + "_transcoded_" + Options.video_transcode_bitrate + "_" + Options.video_crf + ".mp4";
			} else if (currentMedia.mediaType == "photo") {
				mediaParameter = PhotoFloat.pathJoin([
					Options.server_cache_path,
					currentMedia.cacheSubdir,
					prefix + currentMedia.cacheBase
					]) + "_" + Options.reduced_sizes[reducedSizesIndex] + ".jpg";
			}
		}

		myShareUrl = url + '?';
		myShareUrl += 'm=' + encodeURIComponent(mediaParameter);
		hash = location.hash;
		if (hash)
			myShareUrl += '#' + hash.substring(1);

		myShareText = Options.page_title;
		myShareTextAdd = currentAlbum.physicalPath;
		if (myShareTextAdd)
			myShareText += ": " + myShareTextAdd.substring(myShareTextAdd.lastIndexOf('/') + 1);

		jQuery.removeData(".ssk");
		$('.ssk').attr('data-text', myShareText);
		$('.ssk-facebook').attr('data-url', myShareUrl);
		$('.ssk-whatsapp').attr('data-url', location.href);
		$('.ssk-twitter').attr('data-url', location.href);
		$('.ssk-google-plus').attr('data-url', myShareUrl);
		$('.ssk-email').attr('data-url', location.href);

		// initialize social buttons (http://socialsharekit.com/)
		SocialShareKit.init({
		});
		if (! Modernizr.flexbox && bottomSocialButtons()) {
			var numSocial = 5;
			var socialWidth = Math.floor(window.innerWidth / numSocial);
			$('.ssk').width(socialWidth * 2 + "px");
		}
	}

	function removeFolderMarker(cacheBase) {
		if (cacheBase.indexOf(Options.folders_string) == 0) {
			cacheBase = cacheBase.substring(Options.folders_string.length);
			if (cacheBase.length > 0)
				cacheBase = cacheBase.substring(1);
		}
		return cacheBase;
	}

	function HideShowSortButtons(albumOrMedia) {
		var selectorInactive, selectorActive;
		var reverseNameSort = albumOrMedia + "NameReverseSort", reverseDateSort = albumOrMedia + "DateReverseSort";
		var nameSort = albumOrMedia + "NameSort";
		var sortReverseClass = "." + albumOrMedia + "-sort-reverse", sortNormalClass = "." + albumOrMedia + "-sort-normal";
		var sort = "." + albumOrMedia + "-sort";
		var sortNameClass = sort + "-name", sortDateClass = sort + "-date";
		var sortReverseNameClass = sortNameClass + sortReverseClass;
		var sortReverseDateClass = sortDateClass + sortReverseClass;
		var sortNormalNameClass = sortNameClass + sortNormalClass;
		var sortNormalDateClass = sortDateClass + sortNormalClass;
		var currentSort = _t(".current-sort");
		var arrayActiveSelectors;
		var latitude, longitude;

		$(sortReverseNameClass).attr("title", _t(sort) + _t(".by-name") + _t(".sort-reverse"));
		$(sortReverseDateClass).attr("title", _t(sort) + _t(".by-date") + _t(".sort-reverse"));
		$(sortNormalNameClass).attr("title", _t(sort) + _t(".by-name"));
		$(sortNormalDateClass).attr("title", _t(sort) + _t(".by-date"));

		if (currentAlbum[nameSort]) {
			currentSort += _t(".by-name");
			if (currentAlbum[reverseNameSort]) {
				currentSort += _t(".sort-reverse");
				selectorInactive = sortReverseNameClass;
				selectorActive = sortNormalNameClass;
			} else {
				selectorInactive = sortNormalNameClass;
				selectorActive = sortReverseNameClass;
			}
			if (currentAlbum[reverseDateSort]) {
				selectorInactive += ", " + sortNormalDateClass;
				selectorActive += ", " + sortReverseDateClass;
			} else {
				selectorInactive += ", " + sortReverseDateClass;
				selectorActive += ", " + sortNormalDateClass;
			}
		} else {
			currentSort += _t(".by-date");
			if (currentAlbum[reverseDateSort]) {
				currentSort += _t(".sort-reverse");
				selectorInactive = sortReverseDateClass;
				selectorActive = sortNormalDateClass;
			} else {
				selectorInactive = sortNormalDateClass;
				selectorActive = sortReverseDateClass;
			}
			if (currentAlbum[reverseNameSort]) {
				selectorInactive += ", " + sortNormalNameClass;
				selectorActive += ", " + sortReverseNameClass;
			} else {
				selectorInactive += ", " + sortReverseNameClass;
				selectorActive += ", " + sortNormalNameClass;
			}
		}
		currentSort += ", ";
		$(selectorInactive).hide();
		$(selectorActive).show();
		arrayActiveSelectors = selectorActive.split(", ");
		for (var sel in arrayActiveSelectors) {
			if (arrayActiveSelectors.hasOwnProperty(sel))
				$(arrayActiveSelectors[sel]).attr("title", currentSort + $(arrayActiveSelectors[sel]).attr("title"));
		}
	}

	function setTitle() {
		var title = "", titleAdd, documentTitle = "", components, i, dateTitle, gpsTitle, originalTitle;
		var titleAnchorClasses, hiddenTitle = "", beginLink, linksToLeave, numLinks, sortButtons, m;
		// gpsLevelNumber is the number of levels for the by gps tree
		// current levels are country, region, place => 3
		var gpsLevelNumber = 3;
		var gpsName = '';
		var mediaForNames = null;
		var gpsHtmlTitle;

		if (Options.page_title !== "")
			originalTitle = Options.page_title;
		else
			originalTitle = translations[language]["#title-string"];

		if (needAlbumNameSort()) {
			currentAlbum.albums = sortByPath(currentAlbum.albums);
			currentAlbum.albumNameSort = true;
			if (getBooleanCookie("albumNameReverseSortRequested")) {
				currentAlbum.albums = currentAlbum.albums.reverse();
				currentAlbum.albumNameReverseSort = true;
			}
		} else if (needAlbumDateSort()) {
			currentAlbum.albums = sortByDate(currentAlbum.albums);
			currentAlbum.albumNameSort = false;
			if (getBooleanCookie("albumDateReverseSortRequested")) {
				currentAlbum.albums = currentAlbum.albums.reverse();
				currentAlbum.albumDateReverseSort = true;
			}
		}
		if (needAlbumNameReverseSort() || needAlbumDateReverseSort()) {
			currentAlbum.albums = currentAlbum.albums.reverse();
			if (needAlbumNameReverseSort())
				currentAlbum.albumNameReverseSort = ! currentAlbum.albumNameReverseSort;
			else
				currentAlbum.albumDateReverseSort = ! currentAlbum.albumDateReverseSort;
		}

		if (needMediaNameSort()) {
			currentAlbum.media = sortByName(currentAlbum.media);
			currentAlbum.mediaNameSort = true;
			if (getBooleanCookie("mediaNameReverseSortRequested")) {
				currentAlbum.media = currentAlbum.media.reverse();
				currentAlbum.mediaNameReverseSort = true;
			}
			if (currentMedia !== null) {
				for (m = 0; m < currentAlbum.media.length; m ++) {
					if (currentAlbum.media[m].cacheBase == currentMedia.cacheBase && currentAlbum.media[m].foldersCacheBase == currentMedia.foldersCacheBase) {
						currentMediaIndex = m;
						break;
					}
				}
			}
		} else if (needMediaDateSort()) {
			currentAlbum.media = sortByDate(currentAlbum.media);
			currentAlbum.mediaNameSort = false;
			if (getBooleanCookie("mediaDateReverseSortRequested")) {
				currentAlbum.media = currentAlbum.media.reverse();
				currentAlbum.mediaDateReverseSort = true;
			}
			if (currentMedia !== null) {
				for (m = 0; m < currentAlbum.media.length; m ++) {
					if (currentAlbum.media[m].cacheBase == currentMedia.cacheBase && currentAlbum.media[m].foldersCacheBase == currentMedia.foldersCacheBase) {
						currentMediaIndex = m;
						break;
					}
				}
			}
		}
		if (needMediaDateReverseSort() || needMediaNameReverseSort()) {
			currentAlbum.media = currentAlbum.media.reverse();
			if (needMediaNameReverseSort())
				currentAlbum.mediaNameReverseSort = ! currentAlbum.mediaNameReverseSort;
			else
				currentAlbum.mediaDateReverseSort = ! currentAlbum.mediaDateReverseSort;
			if (currentMediaIndex !== undefined && currentMediaIndex != -1)
				currentMediaIndex = currentAlbum.media.length - 1 - currentMediaIndex;
		}

		if (! currentAlbum.path.length)
			components = [originalTitle];
		else {
			components = currentAlbum.path.split("/");
			components.unshift(originalTitle);
		}

		dateTitle = (components.length > 1 && components[1] == Options.by_date_string);
		gpsTitle = (components.length > 1 && components[1] == Options.by_gps_string);

		// textComponents = components doesn't work: textComponents becomes a pointer to components
		var textComponents = [];
		for (i = 0; i < components.length; ++i)
			textComponents[i] = components[i];

		// generate the title in the page top
		var anchorOpened = false, spanOpened = false;
		titleAnchorClasses = 'title-anchor';
		if (isMobile.any())
			titleAnchorClasses += ' mobile';
		for (i = 0; i < components.length; ++i) {
			if (gpsTitle) {
				if (currentMedia !== null)
					mediaForNames = currentMedia;
				else
					mediaForNames = currentAlbum.media[0];
				if (i == 2)
					gpsName = mediaForNames.geoname.country_name;
				else if (i == 3)
					gpsName = mediaForNames.geoname.region_name;
				else if (i == 4)
					gpsName = mediaForNames.geoname.place_name;

				if (gpsName == '')
					gpsName = _t('.not-specified');
				gpsHtmlTitle = _t("#place-icon-title") + gpsName;
			}

			if (i != 1 || components[i] != Options.folders_string) {
				if (i < components.length - 1 || currentMedia !== null) {
					if (i != 0 || ! (dateTitle || gpsTitle)) {
						if (i == 1 && (dateTitle || gpsTitle)) {
							title = "<a class='" + titleAnchorClasses + "' href='#!/" + encodeURI(currentAlbum.ancestorsCacheBase[i]) + "'>" + title;
							anchorOpened = true;
						} else {
							titleAdd = "<a class='" + titleAnchorClasses + "' href='#!/" + encodeURI(i ? currentAlbum.ancestorsCacheBase[i] : "") + "'";
							if (gpsTitle && [2, 3, 4].indexOf(i) > -1)
								titleAdd += " title='" + _t("#place-icon-title") + gpsName + _t("#place-icon-title-end") + "'";
							title += titleAdd + ">";
							anchorOpened = true;
						}
					}
				} else {
					title += "<span class='title-no-anchor'>";
					spanOpened = true;
				}
				if (i == 1 && dateTitle)
					title += "(" + _t("#by-date") + ")";
				else if (i == 1 && gpsTitle)
					title += "(" + _t("#by-gps") + ")";
				else {
					if (gpsTitle && i >= 2 && i <= 4) {
						// i == 2 corresponds to the country, i == 4 to the place,
						title += gpsName;
						if (currentMedia !== null) {
							latitude = currentMedia.metadata.latitude;
							longitude = currentMedia.metadata.longitude;
						} else {
							 arrayCoordinates = currentAlbum.ancestorsCenter[i];
							 latitude = arrayCoordinates["latitude"];
							 longitude = arrayCoordinates["longitude"];
						}
						if (anchorOpened) {
							title += "</a>";
							anchorOpened = false;
						} else if (spanOpened) {
							title += "</span>";
							spanOpened = false;
						}
						title += "<a href=" + mapLink(latitude, longitude, Options.map_zoom_levels[(i - 2)]) + " target='_blank'>" +
											"<img class='title-img' title='" + gpsHtmlTitle + "' alt='" + gpsHtmlTitle + "' height='15px' src='img/world-map-with-pointer.png'>" +
											"</a>";
					} else
						title += textComponents[i];
				}

				if (i < components.length - 1 || currentMedia !== null) {
					if (! (i == 0 && (dateTitle || gpsTitle))) {
						if (anchorOpened)
							title += "</a>";
						anchorOpened = false;
					}
				} else {
					if (! isMobile.any()) {
						title += " <span id=\"title-count\">(";
						if (dateTitle || gpsTitle) {
							title += currentAlbum.media.length + " ";
							title += _t(".title-media") + " ";
							if (gpsTitle) {
								if (components.length >= gpsLevelNumber + 2)
									title += _t("#title-in-gps-album");
								else
									title += _t("#title-in-gpss-album");
							} else if (dateTitle) {
							 	if (components.length >= 5)
									title += _t("#title-in-day-album");
								else
									title += _t("#title-in-date-album");
							}
						} else {
							var numMediaInSubAlbums = currentAlbum.numMediaInSubTree - currentAlbum.media.length;
							if (currentAlbum.media.length) {
								title += currentAlbum.media.length + " ";
								title += _t(".title-media") + " ";
								title += _t("#title-in-album");
								if (numMediaInSubAlbums)
									title += ", ";
							}
							if (numMediaInSubAlbums) {
								title += numMediaInSubAlbums + " ";
								if (! currentAlbum.media.length)
									title += _t(".title-media") + " ";
								title += _t("#title-in-subalbums");
							}
							if (currentAlbum.media.length > 0 && numMediaInSubAlbums > 0) {
								title += ", ";
								title += _t("#title-total") + " ";
								title += currentAlbum.media.length + numMediaInSubAlbums + " ";
							}
						}
						title += ")</span>";
					}
					title += "</span>";
				}
			}
			if (i == 0 && (dateTitle || gpsTitle))
				title += " ";
			else if ((i < components.length - 1 || currentMedia !== null) &&
				(i == components.length - 1 || components[i + 1] != Options.folders_string))
				title += "&raquo;";
		}

		// leave only the last link on mobile
		linksToLeave = 1;
		numLinks = title.split("<a class=").length - 1;
		if (isMobile.any() && numLinks > linksToLeave) {
			for (i = 1; i <= numLinks - linksToLeave; i ++) {
				beginLink = title.indexOf("<a class=", 3);
				hiddenTitle += title.substring(0, beginLink);
				title = title.substring(beginLink);
			}
			title = "<a id=\"dots\" href=\"javascript:void(0)\">... &raquo; </a><span id=\"hidden-title\">" + hiddenTitle + "</span> " + title;
		}

		if (currentMedia !== null) {
			title += "<span id=\"media-name\">" + photoFloat.trimExtension(currentMedia.name) + "</span>";
			if (hasGpsData(currentMedia)) {
				latitude = currentMedia.metadata.latitude;
				longitude = currentMedia.metadata.longitude;
				title += "<a href=" + mapLink(latitude, longitude, Options.photo_map_zoom_level) + " target='_blank'>" +
										"<img class='title-img' title='" + _t("#show-on-map") + " [s]' alt='" + _t("#show-on-map") + "' height='15px' src='img/world-map-with-pointer.png'>" +
										"</a>";
			}
		}

		else if (currentMedia !== null || currentAlbum !== null && ! currentAlbum.albums.length && currentAlbum.media.length == 1) {
			title += " &raquo; <span id=\"media-name\">" + photoFloat.trimExtension(currentAlbum.media[0].name) + "</span>";
			sortButtons = false;
		}
		else {
			sortButtons = true;
			// the buttons for changing sort
			title +=
				"<span class=\"sort\">";
			if (currentAlbum.albums.length > 1) {
				title +=
					"<img class=\"album-sort album-sort-date album-sort-normal \" title=\"" + _t(".album-sort") + _t(".by-date") + "\" height=\"15px\" src=\"img/folder_sort_date.png\">";
				title +=
					"<img class=\"album-sort album-sort-date album-sort-reverse \" title=\"" + _t(".album-sort") + _t(".by-date") + _t(".sort-reverse") + "\" height=\"15px\" src=\"img/folder_sort_date_reverse.png\">";
				title +=
					"<img class=\"album-sort album-sort-name album-sort-normal \" title=\"" + _t(".album-sort") + _t(".by-name") + "\" height=\"15px\" src=\"img/folder_sort_name.png\">";
				title +=
					"<img class=\"album-sort album-sort-name album-sort-reverse \" title=\"" + _t(".album-sort") + _t(".by-name") + _t(".sort-reverse") + "\" height=\"15px\" src=\"img/folder_sort_name_reverse.png\">";
			}
			if (currentAlbum.media.length > 1) {
				title +=
					"<img class=\"media-sort media-sort-date media-sort-normal \" title=\"" + _t(".media-sort-date") + "\" height=\"15px\" src=\"img/media_sort_date.png\">";
				title +=
					"<img class=\"media-sort media-sort-date media-sort-reverse \" title=\"" + _t(".media-sort-date") + " " + _t(".sort-reverse") + "\" height=\"15px\" src=\"img/media_sort_date_reverse.png\">";
				title +=
					"<img class=\"media-sort media-sort-name media-sort-normal \" title=\"" + _t(".media-sort-name") + "\" height=\"15px\" src=\"img/media_sort_name.png\">";
				title +=
					"<img class=\"media-sort media-sort-name media-sort-reverse \" title=\"" + _t(".media-sort-name") + " " + _t(".sort-reverse") + "\" height=\"15px\" src=\"img/media_sort_name_reverse.png\">";
			}
			title +=
				"</span>";
		}

		document.title = documentTitle;
		$("#title-string").html(title);

		$("#dots").off();
		$("#dots").on('click', function(ev) {
			if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
				$("#dots").hide();
				$("#hidden-title").show();
				return false;
			}
		});

		// generate the html page title
		for (i = 0; i < components.length; ++i) {
			if (i == 0) {
				documentTitle += components[0];
				if (components.length > 2 || currentMedia !== null)
					documentTitle = " \u00ab " + documentTitle;
			}
			else if (i == 1)
			 	if (dateTitle)
					documentTitle += " (" + _t("#by-date") + ")";
				else if (gpsTitle)
					documentTitle += " (" + _t("#by-gps") + ")";

			else if (i > 1) {
				documentTitle = textComponents[i] + documentTitle;
				if (i < components.length - 1 || currentMedia !== null)
					documentTitle = " \u00ab " + documentTitle;
			}
		}
		if (currentMedia !== null)
			documentTitle = photoFloat.trimExtension(currentMedia.name) + documentTitle;
		else if (currentMedia !== null || currentAlbum !== null && ! currentAlbum.albums.length && currentAlbum.media.length == 1)
			documentTitle =  photoFloat.trimExtension(currentAlbum.media[0].name) + " \u00ab " + documentTitle;

		if (sortButtons) {
			if (currentAlbum.albums.length > 1) {
				$(".album-sort").show();
				HideShowSortButtons("album");
			} else
				$(".album-sort").hide();

			if (currentAlbum.media.length > 1) {
				$(".media-sort").show();
				HideShowSortButtons("media");
			} else
				$(".media-sort").hide();

			if (isMobile.any()) {
				$(".sort").css("padding", "0 .5em").css("display", "inline");
			} else {
				$("body").off();
				$("body").on('mouseenter', "#title-container", function() {
					$(".sort").show();
				});
				$("body").on('mouseleave', "#title-container", function() {
					$(".sort").hide();
				});
			}

			if (currentAlbum.albums.length > 1) {
				$(".album-sort-date.album-sort-reverse").unbind('click');
				$(".album-sort-date.album-sort-reverse").on('click', function(ev) {
					if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
						if (currentAlbum.albumNameSort) {
							currentAlbum.albums = sortByDate(currentAlbum.albums);
							currentAlbum.albumNameSort = false;
							currentAlbum.albums = currentAlbum.albums.reverse();
						} else if (! currentAlbum.albumDateReverseSort) {
							currentAlbum.albums = currentAlbum.albums.reverse();
						} else
							return;
						currentAlbum.albumDateReverseSort = true;
						setBooleanCookie("albumNameSortRequested", false);
						setBooleanCookie("albumDateReverseSortRequested", true);
						HideShowSortButtons("album");
						showAlbum("sortAlbums");
						return false;
					}
				});

				$(".album-sort-name.album-sort-reverse").unbind('click');
				$(".album-sort-name.album-sort-reverse").on('click', function(ev) {
					if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
						if (! currentAlbum.albumNameSort) {
							currentAlbum.albums = sortByPath(currentAlbum.albums);
							currentAlbum.albumNameSort = true;
							currentAlbum.albums = currentAlbum.albums.reverse();
						} else if (! currentAlbum.albumNameReverseSort) {
							currentAlbum.albums = currentAlbum.albums.reverse();
						} else
							return;
						currentAlbum.albumNameReverseSort = true;
						setBooleanCookie("albumNameSortRequested", true);
						setBooleanCookie("albumNameReverseSortRequested", true);
						HideShowSortButtons("album");
						showAlbum("sortAlbums");
						return false;
					}
				});

				$(".album-sort-date.album-sort-normal").unbind('click');
				$(".album-sort-date.album-sort-normal").on('click', function(ev) {
					if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
						if (currentAlbum.albumNameSort) {
							currentAlbum.albums = sortByDate(currentAlbum.albums);
							currentAlbum.albumNameSort = false;
						} else if (currentAlbum.albumDateReverseSort) {
							currentAlbum.albums = currentAlbum.albums.reverse();
						} else
							return;
						currentAlbum.albumDateReverseSort = false;
						setBooleanCookie("albumNameSortRequested", false);
						setBooleanCookie("albumDateReverseSortRequested", false);
						HideShowSortButtons("album");
						showAlbum("sortAlbums");
						return false;
					}
				});

				$(".album-sort-name.album-sort-normal").unbind('click');
				$(".album-sort-name.album-sort-normal").on('click', function(ev) {
					if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
						if (! currentAlbum.albumNameSort) {
							currentAlbum.albums = sortByPath(currentAlbum.albums);
							currentAlbum.albumNameSort = true;
						} else if (currentAlbum.albumNameReverseSort) {
							currentAlbum.albums = currentAlbum.albums.reverse();
						} else
							return;
						currentAlbum.albumNameReverseSort = false;
						setBooleanCookie("albumNameSortRequested", true);
						setBooleanCookie("albumNameReverseSortRequested", false);
						HideShowSortButtons("album");
						showAlbum("sortAlbums");
						return false;
					}
				});
			}

			if (currentAlbum.media.length > 1) {
				$(".media-sort-date.media-sort-reverse").unbind('click');
				$(".media-sort-date.media-sort-reverse").on('click', function(ev) {
					if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
						if (currentAlbum.mediaNameSort) {
							currentAlbum.media = sortByDate(currentAlbum.media);
							currentAlbum.mediaNameSort = false;
							currentAlbum.media = currentAlbum.media.reverse();
						} else if (! currentAlbum.mediaDateReverseSort) {
							currentAlbum.media = currentAlbum.media.reverse();
						} else
							return;
						currentAlbum.mediaDateReverseSort = true;
						setBooleanCookie("mediaNameSortRequested", false);
						setBooleanCookie("mediaDateReverseSortRequested", true);
						HideShowSortButtons("media");
						showAlbum("sortMedia");
						return false;
					}
				});

				$(".media-sort-name.media-sort-reverse").unbind('click');
				$(".media-sort-name.media-sort-reverse").on('click', function(ev) {
					if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
						if (! currentAlbum.mediaNameSort) {
							currentAlbum.media = sortByName(currentAlbum.media);
							currentAlbum.mediaNameSort = true;
							currentAlbum.media = currentAlbum.media.reverse();
						} else if (! currentAlbum.mediaNameReverseSort) {
							currentAlbum.media = currentAlbum.media.reverse();
						} else
							return;
						currentAlbum.mediaNameReverseSort = true;
						setBooleanCookie("mediaNameSortRequested", true);
						setBooleanCookie("mediaNameReverseSortRequested", true);
						HideShowSortButtons("media");
						showAlbum("sortMedia");
						return false;
					}
				});

				$(".media-sort-date.media-sort-normal").unbind('click');
				$(".media-sort-date.media-sort-normal").on('click', function(ev) {
					if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
						if (currentAlbum.mediaNameSort) {
							currentAlbum.media = sortByDate(currentAlbum.media);
							currentAlbum.mediaNameSort = false;
						} else if (currentAlbum.mediaDateReverseSort) {
							currentAlbum.media = currentAlbum.media.reverse();
						} else
							return;
						currentAlbum.mediaDateReverseSort = false;
						setBooleanCookie("mediaNameSortRequested", false);
						setBooleanCookie("mediaDateReverseSortRequested", false);
						HideShowSortButtons("media");
						showAlbum("sortMedia");
						return false;
					}
				});

				$(".media-sort-name.media-sort-normal").unbind('click');
				$(".media-sort-name.media-sort-normal").on('click', function(ev) {
					if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
						if (! currentAlbum.mediaNameSort) {
							currentAlbum.media = sortByName(currentAlbum.media);
							currentAlbum.mediaNameSort = true;
						} else if (currentAlbum.mediaNameReverseSort) {
							currentAlbum.media = currentAlbum.media.reverse();
						} else
							return;
						currentAlbum.mediaNameReverseSort = false;
						setBooleanCookie("mediaNameSortRequested", true);
						setBooleanCookie("mediaNameReverseSortRequested", false);
						HideShowSortButtons("media");
						showAlbum("sortMedia");
						return false;
					}
				});
			}
			setOptions();
		}
	}

	function cacheBaseToCoordinateArray(cacheBase) {
		array = cacheBase.split(Options.cache_folder_separator).slice(1);
		for (var i = 0; i < array.length; i++) {
			array[i] = array[i].split('_');
			for (var j = 0; j < 2; j++)
					array[i][j] = parseFloat(array[i][j]);
		}
		return array;
	}

	// see https://stackoverflow.com/questions/1069666/sorting-javascript-object-by-property-value
	function sortByName(mediaList) {
		return sortBy(mediaList, 'name');
	}

	function sortByPath(albumList) {
		if (albumList[0].cacheBase.indexOf(Options.by_gps_string) == 0)
			return sortBy(albumList, 'name');
		else
			return sortBy(albumList, 'path');
	}

	function sortBy(albumOrMediaList, field) {
		return albumOrMediaList.sort(function(a,b) {
			var aValue = a[field];
			var bValue = b[field];
			return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
		});
	}

	function sortByDate(albumOrMediaList) {
		return albumOrMediaList.sort(function(a,b) {
			var aValue = new Date(a.date);
			var bValue = new Date(b.date);
			return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
		});
	}

	function scrollToThumb() {
		var media, thumb;


		media = currentMedia;
		if (media === null) {
			media = previousMedia;
			if (media === null)
				return;
		}
		$("#thumbs img").each(function() {
			if (
				(currentAlbum.cacheBase.indexOf(PhotoFloat.foldersStringWithTrailingSeparator) === 0 || currentAlbum.cacheBase == Options.folders_string) && this.title === media.name ||
				currentAlbum.cacheBase.indexOf(PhotoFloat.byDateStringWithTrailingSeparator) === 0 && this.title === media.albumName ||
				currentAlbum.cacheBase.indexOf(PhotoFloat.byGpsStringWithTrailingSeparator) === 0 && this.title === media.albumName
			) {
				thumb = $(this);
				return false;
			}
		});
		if (typeof thumb === "undefined")
			return;
		if (currentMedia !== null) {
			var scroller = $("#album-view");
			scroller.stop().animate(
				{ scrollLeft: thumb.parent().position().left + scroller.scrollLeft() - scroller.width() / 2 + thumb.width() / 2 }, "slow"
			);
		} else
			$("html, body").stop().animate({ scrollTop: thumb.offset().top - $(window).height() / 2 + thumb.height() }, "slow");

		if (currentMedia !== null) {
			$(".thumb-container").removeClass("current-thumb");
			thumb.parent().addClass("current-thumb");
		}
	}

	function albumButtonWidth(thumbnailWidth, buttonBorder) {
		if (Options.albums_slide_style)
			return Math.round((thumbnailWidth + 2 * buttonBorder) * 1.1);
		else
			return thumbnailWidth + 2 * buttonBorder;
	}

	function showAlbum(populate) {
		var i, link, image, media, thumbsElement, subalbums, subalbumsElement, hash, thumbHash, thumbnailSize;
		var width, height, thumbWidth, thumbHeight, imageString, calculatedWidth, populateMedia;
		var albumViewWidth, correctedAlbumThumbSize = Options.album_thumb_size;
		var mediaWidth, mediaHeight, slideBorder = 0, scrollBarWidth = 0, buttonBorder = 1, margin, imgTitle;
		var tooBig = false, virtualAlbum = false;
		var mapLinkIcon;

		PhotoFloat.subalbumIndex = 0;

		if (Options.albums_slide_style)
			slideBorder = 3;

		if (currentMedia === null && previousMedia === null)
			$("html, body").stop().animate({ scrollTop: 0 }, "slow");
		if (populate) {
			thumbnailSize = Options.media_thumb_size;

			populateMedia = populate;
			virtualAlbum = (currentAlbum.cacheBase.indexOf(Options.by_date_string) == 0 || currentAlbum.cacheBase.indexOf(Options.by_gps_string) == 0);
			tooBig = currentAlbum.path.split("/").length < 4 && currentAlbum.media.length > Options.big_virtual_folders_threshold;
			if (populateMedia === true && virtualAlbum)
				populateMedia = populateMedia && ! tooBig;

			if (virtualAlbum && tooBig) {
				$("#thumbs").empty();
				$("#error-too-many-images").html(
					"<span id=\"too-many-images\">" + _t('#too-many-images') + "</span>: " + currentAlbum.media.length +
					" (<span id=\"too-many-images-limit-is\">" + _t('#too-many-images-limit-is') + "</span> " + Options.big_virtual_folders_threshold +  ")</span>"
				).show();
			} else if (
				populateMedia === true ||
				populateMedia === "sortMedia"
			) {
				media = [];
				for (i = 0; i < currentAlbum.media.length; ++i) {
					width = currentAlbum.media[i].metadata.size[0];
					height = currentAlbum.media[i].metadata.size[1];
					thumbHash = chooseThumbnail(currentAlbum, currentAlbum.media[i], thumbnailSize, thumbnailSize);

					if (thumbHash.indexOf(PhotoFloat.byDateStringWithTrailingSeparator) === 0 || thumbHash.indexOf(PhotoFloat.byGpsStringWithTrailingSeparator) === 0) {
						currentAlbum.media[i].completeName = PhotoFloat.pathJoin([currentAlbum.media[i].foldersAlbum, currentAlbum.media[i].name]);
						thumbHash = currentAlbum.cacheBase + Options.cache_folder_separator + currentAlbum.media[i].cacheBase;
					}

					if (Options.media_thumb_type == "fixed_height") {
						if (height < Options.media_thumb_size) {
							thumbHeight = height;
							thumbWidth = width;
						} else {
							thumbHeight = Options.media_thumb_size;
							thumbWidth = thumbHeight * width / height;
						}
						calculatedWidth = thumbWidth;
					} else if (Options.media_thumb_type == "square") {
						if (Math.max(width, height) < Options.media_thumb_size) {
							thumbHeight = height;
							thumbWidth = width;
						} else {
							thumbHeight = thumbnailSize;
							thumbWidth = thumbnailSize;
						}
						calculatedWidth = Options.media_thumb_size;
					}
					if (currentAlbum.cacheBase.indexOf(PhotoFloat.byDateStringWithTrailingSeparator) === 0 || currentAlbum.cacheBase.indexOf(PhotoFloat.byGpsStringWithTrailingSeparator) === 0)
						imgTitle = currentAlbum.media[i].albumName;
					else
						imgTitle = currentAlbum.media[i].name;

					mapLinkIcon = "";
					if (hasGpsData(currentAlbum.media[i])) {
						var latitude = currentAlbum.media[i].metadata.latitude;
						var longitude = currentAlbum.media[i].metadata.longitude;
						mapLinkIcon = "<a href=" + mapLink(latitude, longitude, Options.photo_map_zoom_level) + " target='_blank'>" +
													"<img class='thumbnail-map-link' title='" + _t("#show-on-map") + " [s]' alt='" + _t("#show-on-map") + "' height='15px' src='img/world-map-with-pointer.png'>" +
													"</a>";
					}

					imageString =	"<div class=\"thumb-and-caption-container\" style=\"" +
										"width: " + calculatedWidth + "px;\"" +
									">" +
								"<div class=\"thumb-container\" " + "style=\"" +
										"width: " + calculatedWidth + "px; " +
										"height: " + Options.media_thumb_size + "px;" +
									"\">" +
									mapLinkIcon +
									"<span class=\"helper\"></span>" +
									"<img title=\"" + imgTitle + "\"" +
										"alt=\"" + photoFloat.trimExtension(currentAlbum.media[i].name) + "\"" +
										"src=\"" +  encodeURI(thumbHash) + "\"" +
										"class=\"thumbnail" + "\"" +
										"height=\"" + thumbHeight + "\"" +
										"width=\"" + thumbWidth + "\"" +
									"/>" +
								"</div>" +
								"<div class=\"media-caption\">" +
								"<span>" +
								currentAlbum.media[i].name.replace(/ /g, "</span> <span style='white-space: nowrap;'>") +
								"</span>";
					imageString += "</div>" +
							"</div>";
					image = $(imageString);

					image.get(0).media = currentAlbum.media[i];
					hash = photoFloat.mediaHashURIEncoded(currentAlbum, currentAlbum.media[i]);
					link = $("<a href=\"#!/" + hash + "\"></a>");
					link.append(image);
					media.push(link);
					(function(theLink, theImage, theAlbum) {
						theImage.error(function() {
							media.splice(media.indexOf(theLink), 1);
							theLink.remove();
							theAlbum.media.splice(theAlbum.media.indexOf(theImage.get(0).media), 1);
						});
					})(link, image, currentAlbum);
				}

				thumbsElement = $("#thumbs");
				thumbsElement.empty();
				thumbsElement.append.apply(thumbsElement, media);
			}

			if (currentMedia === null) {
				if (fromEscKey && firstEscKey) {
					// respect the existing mediaLink (you cannot do it more than once)
					firstEscKey = false;
				} else {
					// reset mediaLink
					if (currentAlbum.media.length)
						mediaLink = "#!/" + photoFloat.mediaHashURIEncoded(currentAlbum, currentAlbum.media[0]);
					else
						mediaLink = "#!/" + encodeURIComponent(currentAlbum.cacheBase);
					firstEscKey = true;
				}
				albumLink = "";
				if (currentAlbum.parentCacheBase && currentAlbum.parentCacheBase != "root")
					albumLink = "#!/" + encodeURIComponent(currentAlbum.parentCacheBase);
				if (
					populate === true ||
					populate === "sortAlbums"
				) {
					subalbums = [];

					// resize down the album buttons if they are too wide
					albumViewWidth = $("body").width() -
							parseInt($("#album-view").css("padding-left")) -
							parseInt($("#album-view").css("padding-right")) -
							scrollBarWidth;
					if ((albumButtonWidth(correctedAlbumThumbSize, buttonBorder) + Options.thumb_spacing) * Options.min_album_thumbnail > albumViewWidth) {
						if (Options.albums_slide_style)
							correctedAlbumThumbSize =
								Math.floor((albumViewWidth / Options.min_album_thumbnail - Options.thumb_spacing - 2 * slideBorder) / 1.1 - 2 * buttonBorder);
						else
							correctedAlbumThumbSize =
								Math.floor(albumViewWidth / Options.min_album_thumbnail - Options.thumb_spacing - 2 * buttonBorder);
					}
					margin = 0;
					if (Options.albums_slide_style)
						margin = Math.round(correctedAlbumThumbSize * 0.05);

					for (i = 0; i < currentAlbum.albums.length; ++i) {
						link = $("<a href=\"#!/" + encodeURIComponent(currentAlbum.albums[i].cacheBase) + "\"></a>");
						imageString = "<div class=\"album-button\"";
						imageString += 		" style=\"";
						imageString += 			"width: " + correctedAlbumThumbSize + "px;";
						imageString += 			" height: " + correctedAlbumThumbSize + "px;";
						imageString += 			" margin-top: " + margin + "px;";
						imageString += 			" margin-left: " + margin + "px;";
						imageString += 			" margin-right: " + margin + "px;";
						if (Options.albums_slide_style)
							imageString +=		" background-color: " + Options.album_button_background_color + ";";
						else
							imageString +=		" border: none;";
						imageString += 			"\"";
						imageString += 		">";
						imageString += "</div>";
						image = $(imageString);
						link.append(image);
						subalbums.push(link);
						(function(theContainer, theAlbum, theImage, theLink) {
							photoFloat.pickRandomMedia(theAlbum, theContainer, function(randomAlbum, randomMedia, originalAlbum, subalbum) {
								var distance = 0;
								var htmlText;
								var folderArray, folder, captionHeight, captionFontSize, buttonAndCaptionHeight, html, titleName, link, goTo;
								var mediaSrc = chooseThumbnail(randomAlbum, randomMedia, Options.album_thumb_size, correctedAlbumThumbSize);

								PhotoFloat.subalbumIndex ++;
								mediaWidth = randomMedia.metadata.size[0];
								mediaHeight = randomMedia.metadata.size[1];
								if (Options.album_thumb_type == "fit") {
									if (mediaWidth < correctedAlbumThumbSize && mediaHeight < correctedAlbumThumbSize) {
										thumbWidth = mediaWidth;
										thumbHeight = mediaHeight;
									} else {
										if (mediaWidth > mediaHeight) {
											thumbWidth = correctedAlbumThumbSize;
											thumbHeight = Math.floor(correctedAlbumThumbSize * mediaHeight / mediaWidth);
										} else {
											thumbWidth = Math.floor(correctedAlbumThumbSize * mediaWidth / mediaHeight);
											thumbHeight = correctedAlbumThumbSize;
										}
										distance = (correctedAlbumThumbSize - thumbHeight) / 2;
									}
								} else if (Options.album_thumb_type == "square") {
									if (mediaWidth < correctedAlbumThumbSize || mediaHeight < correctedAlbumThumbSize) {
										thumbWidth = mediaWidth;
										thumbHeight = mediaHeight;
									} else {
										thumbWidth = correctedAlbumThumbSize;
										thumbHeight = correctedAlbumThumbSize;
									}
								}

								if (currentAlbum.path.indexOf(Options.by_date_string) === 0) {
									titleName = PhotoFloat.pathJoin([randomMedia.dayAlbum, randomMedia.name]).substr(Options.by_date_string.length + 1);
									link = PhotoFloat.pathJoin(["#!", randomMedia.dayAlbumCacheBase, randomMedia.foldersCacheBase, randomMedia.cacheBase]);
								} else if (currentAlbum.path.indexOf(Options.by_gps_string) === 0) {
									titleName = PhotoFloat.pathJoin([randomMedia.gpsAlbum, randomMedia.name]).substr(Options.by_gps_string.length + 1);
									link = PhotoFloat.pathJoin(["#!", randomMedia.gpsAlbumCacheBase, randomMedia.foldersCacheBase, randomMedia.cacheBase]);
								} else {
									titleName = randomMedia.albumName.substr(Options.server_album_path.length + 1);
									link = PhotoFloat.pathJoin(["#!", randomMedia.foldersCacheBase, randomMedia.cacheBase]);
								}
								titleName = titleName.substr(titleName.indexOf('/') + 1);
								goTo = _t(".go-to") + " " + titleName;
								htmlText =	"<a href=\"" + link + "\">" +
										"<img src=\"img/link-arrow.png\" " +
											"title=\"" + goTo + "\" " +
											"alt=\"" + goTo + "\" " +
											"class=\"album-button-random-media-link\" " +
											" style=\"width: 20px;" +
												" height: 20px;" +
												"\"" +">" +
										"</a>" +
										"<span class=\"helper\"></span>" +
										"<img " +
											"title=\"" + titleName + "\"" +
											" class=\"thumbnail\"" +
											" src=\"" + encodeURI(mediaSrc) + "\"" +
											" style=\"width:" + thumbWidth + "px;" +
												" height:" + thumbHeight + "px;" +
												"\"" +
										">";
								theImage.html(htmlText);

								if (originalAlbum.path.indexOf(Options.by_date_string) === 0) {
									folderArray = subalbum.cacheBase.split(Options.cache_folder_separator);
									folder = "";
									if (folderArray.length >= 2)
										folder += folderArray[1];
									if (folderArray.length >= 3)
										folder += "-" + folderArray[2];
									if (folderArray.length == 4)
										folder += "-" + folderArray[3];
								} else if (originalAlbum.path.indexOf(Options.by_gps_string) === 0) {
									var level = subalbum.cacheBase.split(Options.cache_folder_separator).length - 2;
									var folderName = '';
									var folderTitle = '';
									if (level == 0)
										folderName = randomAlbum.media[0].geoname.country_name;
									else if (level == 1)
										folderName = randomAlbum.media[0].geoname.region_name;
									else if (level == 2)
										folderName = randomAlbum.media[0].geoname.place_name;
									if (folderName == '')
										folderName = _t('.not-specified');
									folderTitle = _t('#place-icon-title') + folderName;

									folder = "<span class='gps-folder'>" +
														folderName +
														"<a href='" + mapLink(subalbum.center.latitude, subalbum.center.longitude, Options.map_zoom_levels[level]) +
																		"' title='" + folderName +
																		"' target='_blank'" +
																">" +
															"<img class='title-img' title='" + folderTitle + "'  alt='" + folderTitle + "' height='15px' src='img/world.png' />" +
														"</a>" +
													"</span>";
								}
								else {
									folder = subalbum.path;
								}

								// get the value in style sheet (element with that class doesn't exist in DOM
								var $el = $('<div class="album-caption"></div>');
								$($el).appendTo('body');
								var paddingTop = parseInt($($el).css('padding-top'));
								$($el).remove();

								captionFontSize = Math.round(em2px("body", 1) * correctedAlbumThumbSize / Options.album_thumb_size);
								captionHeight = captionFontSize * 3;
								buttonAndCaptionHeight = correctedAlbumThumbSize + captionHeight * 1.6 + paddingTop + 3 * 4;
								html = "<div class=\"album-button-and-caption";
								if (Options.albums_slide_style)
									html += " slide";
								html += "\"";
								html += "style=\"";
								html += 	"height: " + buttonAndCaptionHeight + "px; " +
										"margin-right: " + Options.thumb_spacing + "px; ";
								html +=		"width: " + albumButtonWidth(correctedAlbumThumbSize, buttonBorder) + "px; ";
								if (Options.albums_slide_style)
									html += "background-color: " + Options.album_button_background_color + "; ";
								html += 	"\"";
								html += ">";
								theImage.wrap(html);

								html = "<div class=\"album-caption\"";
								html += " style=\"width: " + correctedAlbumThumbSize + "px; " +
										"font-size: " + captionFontSize + "px; " +
										"height: " + captionHeight + "px; ";
								html += 	"color: " + Options.album_caption_color + "; ";
								html += "\"";
								html += ">" + folder ;
								html += "</div>";
								html += "<div class=\"album-caption-count\"";
								html += 	"style=\"font-size: " + Math.round((captionFontSize / 1.5)) + "px;" +
										"height: " + Math.round(captionHeight / 2) + "px; ";
								html += 	"color: " + Options.album_caption_color + ";\"";
								html += ">(";
								html +=		subalbum.numMediaInSubTree;
								html +=		" <span class=\"title-media\">";
								html +=		_t(".title-media");
								html +=		"</span>";
								html += ")</div>";
								theImage.parent().append(html);
								numSubAlbumsReady ++;
								if (numSubAlbumsReady >= originalAlbum.albums.length) {
									// now all the subalbums random thumbnails has been loaded
									// we can run the function that prepare the stuffs for sharing
									socialButtons();
								}
							}, function error() {
								theContainer.albums.splice(currentAlbum.albums.indexOf(theAlbum), 1);
								theLink.remove();
								subalbums.splice(subalbums.indexOf(theLink), 1);
							});
							i++; i--;
						})(currentAlbum, currentAlbum.albums[i], image, link);

					}

					subalbumsElement = $("#subalbums");
					subalbumsElement.empty();
					subalbumsElement.append.apply(subalbumsElement, subalbums);
					subalbumsElement.insertBefore(thumbsElement);
				}
			}

		}

		if (currentMedia === null) {
			$(".thumb-container").removeClass("current-thumb");
			$("#album-view").removeClass("media-view-container");
			$("#subalbums").show();
			$("#media-view").hide();
			$("#media-view").removeClass("no-bottom-space");
			$("#album-view").removeClass("no-bottom-space");
			$("#media-box-inner").empty();
			$("#media-box").hide();
			$("#thumbs").show();
			$("#day-gps-folders-view-container").show();
			$("#folders-view-link").attr("href", "#!/" + encodeURIComponent(Options.folders_string));
			$("#by-date-view-link").attr("href", "#!/" + encodeURIComponent(Options.by_date_string));
			$("#by-gps-view-link").attr("href", "#!/" + encodeURIComponent(Options.by_gps_string));
			if (currentAlbum.cacheBase == Options.folders_string) {
				$("#folders-view-container").hide();
				$("#by-date-view-container").show();
				photoFloat.showByGpsButton();
			} else if (currentAlbum.cacheBase == Options.by_date_string) {
				$("#folders-view-container").show();
				$("#by-date-view-container").hide();
				photoFloat.showByGpsButton();
			}	else if (currentAlbum.cacheBase == Options.by_gps_string) {
				$("#folders-view-container").show();
				$("#by-date-view-container").show();
				$("#by-gps-view-container").hide();
			} else {
				$("#folders-view-container").hide();
				$("#by-date-view-container").hide();
				$("#by-gps-view-container").hide();
			}
			$("#powered-by").show();
		} else {
			if (currentAlbum.media.length == 1)
				$("#thumbs").hide();
			else
				$("#thumbs").show();
			$("#powered-by").hide();
		}

		setOptions();

		setTimeout(scrollToThumb, 1);
	}

	function getDecimal(fraction) {
		if (fraction[0] < fraction[1])
			return fraction[0] + "/" + fraction[1];
		return (fraction[0] / fraction[1]).toString();
	}

	function lateralSocialButtons() {
		return $(".ssk-group").css("display") == "block";
	}
	function bottomSocialButtons() {
		return ! lateralSocialButtons();
	}
	function scaleMedia() {
		var media, container, containerBottom = 0, containerTop = 0, containerRatio, photoSrc, previousSrc;
		var containerHeight = $(window).innerHeight(), containerWidth = $(window).innerWidth(), mediaBarBottom = 0;
		var width = currentMedia.metadata.size[0], height = currentMedia.metadata.size[1], ratio = width / height;

		if (fullScreenStatus && Modernizr.fullscreen)
			container = $(window);
		else {
			container = $("#media-view");
			if ($("#thumbs").is(":visible"))
				containerBottom = $("#album-view").outerHeight();
			else if (bottomSocialButtons() && containerBottom < $(".ssk").outerHeight())
				// correct container bottom when social buttons are on the bottom
				containerBottom = $(".ssk").outerHeight();
			containerTop = 0;
			if ($("#title-container").is(":visible"))
				containerTop = $("#title-container").outerHeight();
			containerHeight -= containerBottom + containerTop;
			container.css("top", containerTop + "px");
			container.css("bottom", containerBottom + "px");
		}

		containerRatio = containerWidth / containerHeight;

		media = $("#media");
		media.off();

		if (currentMedia.mediaType == "photo") {
			photoSrc = chooseReducedPhoto(currentMedia, container);
			previousSrc = media.attr("src");
			// chooseReducedPhoto() sets maxSize to 0 if it returns the original media
			if (maxSize) {
				if (width > height && width > maxSize) {
					height = Math.round(height * maxSize / width);
					width = maxSize;
				} else if (height > width && height > maxSize) {
					width = Math.round(width * maxSize / height);
					height = maxSize;
				}
			}
			if (photoSrc != previousSrc || media.attr("width") != width || media.attr("height") != height) {
				$("link[rel=image_src]").remove();
				$('link[rel="video_src"]').remove();
				$("head").append("<link rel=\"image_src\" href=\"" + encodeURI(photoSrc) + "\" />");
				media
					.attr("src", encodeURI(photoSrc))
					.attr("width", width)
					.attr("height", height)
					.attr("ratio", ratio);
			}
		}

		if (parseInt(media.attr("width")) > containerWidth && media.attr("ratio") > containerRatio) {
			height = container.width() / media.attr("ratio");
			media
				.css("width", containerWidth + "px")
				.css("height", (containerWidth / ratio) + "px")
				.parent()
					.css("height", height)
					.css("margin-top", - height / 2)
					.css("top", "50%");
			if (currentMedia.mediaType == "video")
				mediaBarBottom = 0;
			else if (currentMedia.mediaType == "photo")
				mediaBarBottom = (containerHeight - containerWidth / ratio) / 2;
		} else if (parseInt(media.attr("height")) > containerHeight && media.attr("ratio") < containerRatio) {
			media
				.css("height", containerHeight + "px")
				.css("width", (containerHeight * ratio) + "px")
				.parent()
					.css("height", "100%")
					.css("margin-top", "0")
					.css("top", "0");
			if (currentMedia.mediaType == "video") {
				media.css("height", parseInt(media.css("height")) - $("#links").outerHeight());
				mediaBarBottom = 0;
			} else if (currentMedia.mediaType == "photo")
				// put media bar slightly below so that video buttons are not covered
				mediaBarBottom = 0;
		} else {
			media
				.css("height", "")
				.css("width", "")
				.parent()
					.css("height", media.attr("height"))
					.css("margin-top", - media.attr("height") / 2)
					.css("top", "50%");
			mediaBarBottom = (container.height() - media.attr("height")) / 2;
			if (fullScreenStatus) {
				if (currentMedia.mediaType == "video") {
					mediaBarBottom = 0;
				}
			}
		}

		$("#media-bar").css("bottom", 0);

		media.show();

		if (! fullScreenStatus && currentAlbum.media.length > 1 && lateralSocialButtons()) {
			// correct back arrow position when social buttons are on the left
			$("#prev").css("left", "");
			$("#prev").css("left", (parseInt($("#prev").css("left")) + $(".ssk").outerWidth()) + "px");
		}

		$(window).on("resize", scaleMedia);
	}
	function chooseReducedPhoto(media, container) {
		var chosenMedia, reducedWidth, reducedHeight;
		var mediaWidth = media.metadata.size[0], mediaHeight = media.metadata.size[1];
		var mediaSize = Math.max(mediaWidth, mediaHeight);
		var mediaRatio = mediaWidth / mediaHeight, containerRatio;

		chosenMedia = PhotoFloat.originalMediaPath(media);
		maxSize = 0;

		if (container == null) {
			// try with what is more probable to be the container
			if (fullScreenStatus)
				container = $(window);
			else {
				container = $("#media-view");
			}
		}

		containerRatio = container.width() / container.height();

		for (var i = 0; i < Options.reduced_sizes.length; i++) {
			if (Options.reduced_sizes[i] < mediaSize) {
				if (mediaWidth > mediaHeight) {
					reducedWidth = Options.reduced_sizes[i];
					reducedHeight = Options.reduced_sizes[i] * mediaHeight / mediaWidth;
				} else {
					reducedHeight = Options.reduced_sizes[i];
					reducedWidth = Options.reduced_sizes[i] * mediaWidth / mediaHeight;
				}

				if (
					mediaRatio > containerRatio && reducedWidth < container.width() * screenRatio ||
					mediaRatio < containerRatio && reducedHeight < container.height() * screenRatio
				)
					break;
			}
			chosenMedia = photoFloat.mediaPath(currentAlbum, media, Options.reduced_sizes[i]);
			maxSize = Options.reduced_sizes[i];
		}
		return chosenMedia;
	}

	function chooseThumbnail(album, media, thumbnailSize, calculatedThumbnailSize) {
		return photoFloat.mediaPath(album, media, thumbnailSize);
	}

	function showMedia(album) {
		var width = currentMedia.metadata.size[0], height = currentMedia.metadata.size[1];
		var prevMedia, nextMedia, text, thumbnailSize, i, changeViewLink, linkTag, triggerLoad, videoOK = true;
		var nextReducedPhoto, prevReducedPhoto;
		var link, linkTitle;

		mediaLink = "#!/" + photoFloat.mediaHashURIEncoded(currentAlbum, currentMedia);
		firstEscKey = true;

		thumbnailSize = Options.media_thumb_size;
		$("#media-box").show();
		if (currentAlbum.media.length == 1) {
			$("#next").hide();
			$("#prev").hide();
			$("#media-view").addClass("no-bottom-space");
			$("#album-view").addClass("no-bottom-space");
			$("#thumbs").hide();
		} else {
			$("#next").show();
			$("#prev").show();
			$("#media-view").removeClass("no-bottom-space");
			$("#album-view").removeClass("no-bottom-space");
			$("#media-view").css("bottom", (thumbnailSize + 15).toString() + "px");
			$("#album-view").css("height", (thumbnailSize + 20).toString() + "px");
			$("#album-view").addClass("media-view-container");
			$("#album-view.media-view-container").css("height", (thumbnailSize + 22).toString() + "px");
			$("#thumbs").show();
		}

		var albumViewHeight = 0;
		if ($("#album-view").is(":visible"))
			albumViewHeight = $("#album-view").outerHeight();

		$('#media').remove();
		$("#media").off("load");

		if (currentMedia.mediaType == "video") {
			if (! Modernizr.video) {
				$('<div id="video-unsupported-html5">' + _t("#video-unsupported-html5") + '</div>').appendTo('#media-box-inner');
				videoOK = false;
			}
			else if (! Modernizr.video.h264) {
				$('<div id="video-unsupported-h264">' + _t("#video-unsupported-h264") + '</div>').appendTo('#media-box-inner');
				videoOK = false;
			}
		}

		if (currentMedia.mediaType == "photo" || currentMedia.mediaType == "video" && videoOK) {

			if (currentMedia.mediaType == "video") {
				if (fullScreenStatus && currentMedia.albumName.match(/\.avi$/) === null) {
					// .avi videos are not played by browsers
					videoSrc = currentMedia.albumName;
				} else {
					videoSrc = photoFloat.mediaPath(currentAlbum, currentMedia, "");
				}
				$('<video/>', { id: 'media', controls: true })
					.appendTo('#media-box-inner')
					.attr("width", width)
					.attr("height", height)
					.attr("ratio", width / height)
					.attr("src", encodeURI(videoSrc))
					.attr("alt", currentMedia.name);
				triggerLoad = "loadstart";
				linkTag = "<link rel=\"video_src\" href=\"" + encodeURI(videoSrc) + "\" />";
			} else if (currentMedia.mediaType == "photo") {
				photoSrc = chooseReducedPhoto(currentMedia, null);
				if (maxSize) {
					if (width > height &&  width > maxSize) {
						height = Math.round(height * maxSize / width);
						width = maxSize;
					} else if (height > width && height > maxSize) {
						width = Math.round(width * maxSize / height);
						height = maxSize;
					}
				}

				$('<img/>', { id: 'media' })
					.appendTo('#media-box-inner')
					.hide()
					.attr("width", width)
					.attr("height", height)
					.attr("ratio", width / height)
					.attr("src", encodeURI(photoSrc))
					.attr("alt", currentMedia.name)
					.attr("title", currentMedia.date);
				linkTag = "<link rel=\"image_src\" href=\"" + encodeURI(photoSrc) + "\" />";
				triggerLoad = "load";
			}

			$("link[rel=image_src]").remove();
			$('link[rel="video_src"]').remove();
			$("head").append(linkTag);
			$('#media').on(triggerLoad, scaleMedia());
			if (! Options.persistent_metadata) {
				$("#metadata").hide();
				$("#metadata-show").show();
				$("#metadata-hide").hide();
			}

			if (currentAlbum.media.length > 1) {
				i = currentMediaIndex;
				currentAlbum.media[currentMediaIndex].byDateName =
					PhotoFloat.pathJoin([currentAlbum.media[currentMediaIndex].dayAlbum, currentAlbum.media[currentMediaIndex].name]);
				currentAlbum.media[currentMediaIndex].byGpsName =
						PhotoFloat.pathJoin([currentAlbum.media[currentMediaIndex].gpsAlbum, currentAlbum.media[currentMediaIndex].name]);
				if (i == 0)
					i = currentAlbum.media.length - 1;
				else
					i --;
				prevMedia = currentAlbum.media[i];
				prevMedia.byDateName = PhotoFloat.pathJoin([prevMedia.dayAlbum, prevMedia.name]);
				prevMedia.byGpsName = PhotoFloat.pathJoin([prevMedia.gpsAlbum, prevMedia.name]);

				i = currentMediaIndex;
				if (i == currentAlbum.media.length - 1)
					i = 0;
				else
					i ++;
				nextMedia = currentAlbum.media[i];
				nextMedia.byDateName = PhotoFloat.pathJoin([nextMedia.dayAlbum, nextMedia.name]);
				nextMedia.byGpsName = PhotoFloat.pathJoin([nextMedia.gpsAlbum, nextMedia.name]);

				if (nextMedia.mediaType == "photo") {
					nextReducedPhoto = chooseReducedPhoto(nextMedia, null);
					$.preloadImages(nextReducedPhoto);
				}
				if (prevMedia.mediaType == "photo") {
					prevReducedPhoto = chooseReducedPhoto(prevMedia, null);
					$.preloadImages(prevReducedPhoto);
				}
			}
		}

		$("#media-view").off('contextmenu click mousewheel');
		$("#media-bar").off();
		$('#next').off();
		$('#prev').off();


		if (currentAlbum.media.length == 1) {
			albumLink = "";
			if (currentAlbum.parentCacheBase && currentAlbum.parentCacheBase != "root")
				albumLink = "#!/" + encodeURIComponent(currentAlbum.parentCacheBase);
			else
				albumLink = "#!/" + encodeURIComponent(currentAlbum.cacheBase);
			nextLink = "";
			prevLink = "";
		} else {
			albumLink = "#!/" + encodeURIComponent(currentAlbum.cacheBase);
			nextLink = "#!/" + photoFloat.mediaHashURIEncoded(currentAlbum, nextMedia);
			prevLink = "#!/" + photoFloat.mediaHashURIEncoded(currentAlbum, prevMedia);
			$("#next").show();
			$("#prev").show();
			$("#media-view")
				//.css('cursor', 'ew-resize')
				.on('contextmenu', function(ev) {
					if (! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
						ev.preventDefault();
						swipeRight(prevLink);
					}
				})
				.on('click', function(ev) {
					if(ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
						swipeLeft(nextLink);
						return false;
					} else
						return true;
				})
				.on('mousewheel', swipeOnWheel);
				//~ .on('contextmenu click mousewheel', function(ev, delta) {
					//~ console.log(ev);
					//~ console.log(ev.handleObj.type);
					//~ console.log(delta);
					//~ if (! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
						//~ ev.preventDefault();
						//~ swipeRight(prevLink);
					//~ }
					//~ if(ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
						//~ swipeLeft(nextLink);
						//~ return false;
					//~ } else
						//~ return true;
					//~ swipeOnWheel(ev, delta)
				//~ });
				$("#media-bar").on('click', function(ev) {
	   			ev.stopPropagation();
				}).on('contextmenu', function(ev) {
	   			ev.stopPropagation();
				});
			$('#next').on('click', function(ev) {
				if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
					swipeLeft(nextLink);
					return false;
				}
			});
			$('#prev').on('click', function(ev) {
				if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
					swipeRight(prevLink);
					return false;
				}
			});
		}

		$("#original-link").attr("target", "_blank").attr("href", encodeURI(photoFloat.originalMediaPath(currentMedia)));
		$("#download-link").attr("href", encodeURI(photoFloat.originalMediaPath(currentMedia))).attr("download", "");
		if (hasGpsData(currentMedia)) {
			$("#menu-map-link").attr("target", "_blank").attr("href", encodeURI(mapLink(currentMedia.metadata.latitude, currentMedia.metadata.longitude, Options.photo_map_zoom_level)));
			$('#menu-map-link').show();
			$('#menu-map-divider').show();
		} else {
			$("#menu-map-link").attr("href", "");
			$('#menu-map-link').hide();
			$('#menu-map-divider').hide();
		}

		$("#folders-view-link").attr("href", "#!/" +
					PhotoFloat.pathJoin([
						encodeURIComponent(currentMedia.foldersCacheBase),
						encodeURIComponent(currentMedia.cacheBase)
					]));
		$("#by-date-view-link").attr("href", "#!/" +
					PhotoFloat.pathJoin([
						encodeURIComponent(currentMedia.dayAlbumCacheBase),
						encodeURIComponent(currentMedia.foldersCacheBase),
						encodeURIComponent(currentMedia.cacheBase)
					]));
		if (hasGpsData(currentMedia)) {
			$("#by-gps-view-link").attr("href", "#!/" +
		 			PhotoFloat.pathJoin([
						encodeURIComponent(currentMedia.gpsAlbumCacheBase),
						encodeURIComponent(currentMedia.foldersCacheBase),
						encodeURIComponent(currentMedia.cacheBase)
					]));
		}
		//$("#day-folders-view-link").attr("href", changeViewLink);

		if (currentAlbum.cacheBase.indexOf(Options.folders_string) === 0) {
			// folder album: change to by date or by gps view
			$("#folders-view-container").hide();
			$("#by-date-view-container").show();
			if (hasGpsData(currentMedia))
				$("#by-gps-view-container").show();
			else
				$("#by-gps-view-container").hide();
		} else if (currentAlbum.cacheBase.indexOf(Options.by_date_string) === 0) {
			// by date album: change to folder or by gps view
			$("#folders-view-container").show();
			$("#by-date-view-container").hide();
			if (hasGpsData(currentMedia))
				$("#by-gps-view-container").show();
			else
				$("#by-gps-view-container").hide();
		} else if (currentAlbum.cacheBase.indexOf(Options.by_gps_string) === 0) {
			// by gps album: change to folder or by day view
			$("#folders-view-container").show();
			$("#by-date-view-container").show();
			$("#by-gps-view-container").hide();
		}

		$('#metadata tr.gps').off('click');
		text = "<table>";
		if (typeof currentMedia.date !== "undefined")
			text += "<tr><td id=\"metadata-data-date\"></td><td>" + currentMedia.date + "</td></tr>";
		if (typeof currentMedia.metadata.size !== "undefined")
			text += "<tr><td id=\"metadata-data-size\"></td><td>" + currentMedia.metadata.size[0] + " x " + currentMedia.metadata.size[1] + "</td></tr>";
		if (typeof currentMedia.metadata.make !== "undefined")
			text += "<tr><td id=\"metadata-data-make\"></td><td>" + currentMedia.metadata.make + "</td></tr>";
		if (typeof currentMedia.metadata.model !== "undefined")
			text += "<tr><td id=\"metadata-data-model\"></td><td>" + currentMedia.metadata.model + "</td></tr>";
		if (typeof currentMedia.metadata.aperture !== "undefined")
			text += "<tr><td id=\"metadata-data-aperture\"></td><td> f/" + getDecimal(currentMedia.metadata.aperture) + "</td></tr>";
		if (typeof currentMedia.metadata.focalLength !== "undefined")
			text += "<tr><td id=\"metadata-data-focalLength\"></td><td>" + getDecimal(currentMedia.metadata.focalLength) + " mm</td></tr>";
		if (typeof currentMedia.metadata.subjectDistanceRange !== "undefined")
			text += "<tr><td id=\"metadata-data-subjectDistanceRange\"></td><td>" + currentMedia.metadata.subjectDistanceRange + "</td></tr>";
		if (typeof currentMedia.metadata.iso !== "undefined")
			text += "<tr><td id=\"metadata-data-iso\"></td><td>" + currentMedia.metadata.iso + "</td></tr>";
		if (typeof currentMedia.metadata.sceneCaptureType !== "undefined")
			text += "<tr><td id=\"metadata-data-sceneCaptureType\"></td><td>" + currentMedia.metadata.sceneCaptureType + "</td></tr>";
		if (typeof currentMedia.metadata.exposureTime !== "undefined")
			text += "<tr><td id=\"metadata-data-exposureTime\"></td><td>" + getDecimal(currentMedia.metadata.exposureTime) + " sec</td></tr>";
		if (typeof currentMedia.metadata.exposureProgram !== "undefined")
			text += "<tr><td id=\"metadata-data-exposureProgram\"></td><td>" + currentMedia.metadata.exposureProgram + "</td></tr>";
		if (typeof currentMedia.metadata.exposureCompensation !== "undefined")
			text += "<tr><td id=\"metadata-data-exposureCompensation\"></td><td>" + getDecimal(currentMedia.metadata.exposureCompensation) + "</td></tr>";
		if (typeof currentMedia.metadata.spectralSensitivity !== "undefined")
			text += "<tr><td id=\"metadata-data-spectralSensitivity\"></td><td>" + currentMedia.metadata.spectralSensitivity + "</td></tr>";
		if (typeof currentMedia.metadata.sensingMethod !== "undefined")
			text += "<tr><td id=\"metadata-data-sensingMethod\"></td><td>" + currentMedia.metadata.sensingMethod + "</td></tr>";
		if (typeof currentMedia.metadata.lightSource !== "undefined")
			text += "<tr><td id=\"metadata-data-lightSource\"></td><td>" + currentMedia.metadata.lightSource + "</td></tr>";
		if (typeof currentMedia.metadata.flash !== "undefined")
			text += "<tr><td id=\"metadata-data-flash\"></td><td>" + currentMedia.metadata.flash + "</td></tr>";
		if (typeof currentMedia.metadata.orientation !== "undefined")
			text += "<tr><td id=\"metadata-data-orientation\"></td><td>" + currentMedia.metadata.orientation + "</td></tr>";
		if (typeof currentMedia.metadata.duration !== "undefined")
			text += "<tr><td id=\"metadata-data-duration\"></td><td>" + currentMedia.metadata.duration + " sec</td></tr>";
		if (typeof currentMedia.metadata.latitude !== "undefined")
			text += "<tr id='map-link' class='gps'><td id=\"metadata-data-latitude\"></td><td>" + currentMedia.metadata.latitudeMS + " </td></tr>";
		if (typeof currentMedia.metadata.longitude !== "undefined")
			text += "<tr class='gps'><td id=\"metadata-data-longitude\"></td><td>" + currentMedia.metadata.longitudeMS + " </td></tr>";
		text += "</table>";
		$("#metadata").html(text);
		linkTitle = _t('#show-map') + Options.map_service;
		$('#metadata tr.gps').attr("title", linkTitle).on('click', function(ev) {
			ev.stopPropagation();
			window.open(mapLink(currentMedia.metadata.latitude, currentMedia.metadata.longitude, Options.photo_map_zoom_level), '_blank');
		});

		translate();

		$("#subalbums").hide();
		$("#media-view").show();
	}

	function hasGpsData(media) {
		return media.mediaType == "photo" && typeof media.metadata.latitude !== "undefined";
	}

	function mapLink(latitude, longitude, zoom) {
		if (Options.map_service == 'openstreetmap') {
			link = 'http://www.openstreetmap.org/#map=' + zoom + '/' + latitude + '/' + longitude;
		}
		else if (Options.map_service == 'googlemaps') {
			link = 'https://www.google.com/maps/@' + latitude + ',' + longitude + ',' + zoom + 'z';
		}
		else if (Options.map_service == 'osmtools') {
			link = 'http://m.osmtools.de/index.php?mlon=' + longitude + '&mlat=' + latitude + '&icon=6&zoom=' + zoom;
		}
		return link;
	}

	function setOptions() {
		var albumThumbnailSize, mediaThumbnailSize;
		albumThumbnailSize = Options.album_thumb_size;
		mediaThumbnailSize = Options.media_thumb_size;
		$("body").css("background-color", Options.background_color);
		$("#folders-view-container").hover(function() {
			//mouse over
			$(this).css("color", Options.switch_button_color_hover);
			$(this).css("background-color", Options.switch_button_background_color_hover);
		}, function() {
			//mouse out
			$(this).css("color", Options.switch_button_color);
			$(this).css("background-color", Options.switch_button_background_color);
		});
		$("#by-date-view-container").hover(function() {
			//mouse over
			$(this).css("color", Options.switch_button_color_hover);
			$(this).css("background-color", Options.switch_button_background_color_hover);
		}, function() {
			//mouse out
			$(this).css("color", Options.switch_button_color);
			$(this).css("background-color", Options.switch_button_background_color);
		});
		$("#by-gps-view-container").hover(function() {
			//mouse over
			$(this).css("color", Options.switch_button_color_hover);
			$(this).css("background-color", Options.switch_button_background_color_hover);
		}, function() {
			//mouse out
			$(this).css("color", Options.switch_button_color);
			$(this).css("background-color", Options.switch_button_background_color);
		});

		$("#title").css("font-size", Options.title_font_size);
		$(".title-anchor").css("color", Options.title_color);
		$(".title-anchor").hover(function() {
			//mouse over
			$(this).css("color", Options.title_color_hover);
		}, function() {
			//mouse out
			$(this).css("color", Options.title_color);
		});
		$("#media-name").css("color", Options.title_image_name_color);
		$(".thumb-and-caption-container").css("margin-right", Options.thumb_spacing.toString() + "px");
	}

	function em2px(selector, em) {
		var emSize = parseFloat($(selector).css("font-size"));
		return (em * emSize);
	}
	function getBooleanCookie(key) {
		var keyValue = document.cookie.match('(^|;) ?' + key + '=([^;]*)(;|$)');
		if (! keyValue)
			return null;
		else if (keyValue[2] == 1)
			return true;
		else
			return false;
	}
	function setBooleanCookie(key, value) {
		var expires = new Date();
		expires.setTime(expires.getTime() + (1 * 24 * 60 * 60 * 1000));
		if (value)
			value = 1;
		else
			value = 0;
		document.cookie = key + '=' + value + ';expires=' + expires.toUTCString();
		return true;
	}

	// this function refer to the need that the html showed be sorted
	function needAlbumNameSort() {
		return ! ! currentAlbum.albums.length && ! currentAlbum.albumNameSort && getBooleanCookie("albumNameSortRequested");
	}
	function needAlbumDateSort() {
		return ! ! currentAlbum.albums.length && currentAlbum.albumNameSort && ! getBooleanCookie("albumNameSortRequested");
	}
	function needAlbumDateReverseSort() {
		return ! ! currentAlbum.albums.length && ! currentAlbum.albumNameSort && currentAlbum.albumDateReverseSort !== getBooleanCookie("albumDateReverseSortRequested");
	}
	function needAlbumNameReverseSort() {
		return ! ! currentAlbum.albums.length && currentAlbum.albumNameSort && currentAlbum.albumNameReverseSort !== getBooleanCookie("albumNameReverseSortRequested");
	}

	function needMediaNameSort() {
		return ! ! currentAlbum.media.length && ! currentAlbum.mediaNameSort && getBooleanCookie("mediaNameSortRequested");
	}
	function needMediaDateSort() {
		return ! ! currentAlbum.media.length && currentAlbum.mediaNameSort && ! getBooleanCookie("mediaNameSortRequested");
	}
	function needMediaDateReverseSort() {
		return ! ! currentAlbum.media.length && ! currentAlbum.mediaNameSort && currentAlbum.mediaDateReverseSort !== getBooleanCookie("mediaDateReverseSortRequested");
	}
	function needMediaNameReverseSort() {
		return ! ! currentAlbum.media.length && currentAlbum.mediaNameSort && currentAlbum.mediaNameReverseSort !== getBooleanCookie("mediaNameReverseSortRequested");
	}

	/* Error displays */

	function die(error) {
		if (error == 403) {
			$("#auth-text").fadeIn(1000);
			$("#password").focus();
		} else {
			// Jason's code only had the following line
			//$("#error-text").fadeIn(2500);

			var rootHash = "!/" + Options.folders_string;

			$("#album-view").fadeOut(200);
			$("#media-view").fadeOut(200);

			if (window.location.hash == "#" + rootHash) {
				$("#loading").hide();
				$("#error-text-folder").stop();
				$("#error-root-folder").fadeIn(2000);
				$("#powered-by").show();
			} else {
				$("#error-text-folder").fadeIn(200);
				$("#error-text-folder, #error-overlay, #auth-text").fadeOut(2500);
				$("#album-view").fadeIn(3500);
				$("#media-view").fadeIn(3500);
				window.location.hash = rootHash;
			}
		}
		$("#error-overlay").fadeTo(500, 0.8);
		$("body, html").css("overflow", "hidden");
	}
	function undie() {
		$("#error-text, #error-overlay, #auth-text").fadeOut(500);
		$("body, html").css("overflow", "auto");
	}



	/* Entry point for most events */

	function hashParsed(album, media, mediaIndex) {
		var populateAlbum;
		undie();
		$("#loading").hide();
		numSubAlbumsReady = 0;

		$(window).off("resize");

		if (album === currentAlbum && media === currentMedia)
			return;
		if (album != currentAlbum)
			currentAlbum = null;

		previousAlbum = currentAlbum;
		if (currentAlbum && currentAlbum.path.indexOf(Options.by_date_string) === 0 && media !== null) {
			previousMedia = media;
		}
		else {
			previousMedia = currentMedia;
		}
		currentAlbum = album;
		currentMedia = media;
		currentMediaIndex = mediaIndex;

		setOptions();

		// album properties reflect the current sorting of album and media objects
		// json files have albums and media sorted by date not reversed

		if (currentAlbum.albumNameSort === undefined)
			currentAlbum.albumNameSort = false;
		if (currentAlbum.albumDateReverseSort === undefined)
			currentAlbum.albumDateReverseSort = false;
		if (currentAlbum.albumNameReverseSort === undefined)
			currentAlbum.albumNameReverseSort = false;

		if (currentAlbum.mediaNameSort === undefined)
			currentAlbum.mediaNameSort = false;
		if (currentAlbum.mediaDateReverseSort === undefined)
			currentAlbum.mediaDateReverseSort = false;
		if (currentAlbum.mediaNameReverseSort === undefined)
			currentAlbum.mediaNameReverseSort = false;

		// cookies reflect the requested sorting in ui
		// they remember the ui state when a change in sort is requested (via the top buttons) and when the hash changes
		// if they are not set yet, they are set to default values

		if (getBooleanCookie("albumNameSortRequested") === null)
			setBooleanCookie("albumNameSortRequested", Options.default_album_name_sort);
		if (getBooleanCookie("albumDateReverseSortRequested") === null)
			setBooleanCookie("albumDateReverseSortRequested", Options.default_album_date_reverse_sort);
		if (getBooleanCookie("albumNameReverseSortRequested") === null)
			setBooleanCookie("albumNameReverseSortRequested", false);

		if (getBooleanCookie("mediaNameSortRequested") === null)
			setBooleanCookie("mediaNameSortRequested", Options.default_media_name_sort);
		if (getBooleanCookie("mediaDateReverseSortRequested") === null)
			setBooleanCookie("mediaDateReverseSortRequested", Options.default_media_date_reverse_sort);
		if (getBooleanCookie("mediaNameReverseSortRequested") === null)
			setBooleanCookie("mediaNameReverseSortRequested", false);

		if (currentMedia === null || typeof currentMedia === "object")
			setTitle();

		if (currentMedia !== null || currentAlbum !== null && ! currentAlbum.albums.length && currentAlbum.media.length == 1)
		{
			if (currentMedia === null) {
				currentMedia = currentAlbum.media[0];
				currentMediaIndex = 0;
			}
			$("#day-gps-folders-view-container").show();
			nextMedia = null;
			previousMedia = null;
			showMedia(currentAlbum);
		}
		else {
			$("#day-gps-folders-view-container").hide();
		}
		populateAlbum = previousAlbum !== currentAlbum || previousMedia !== currentMedia;
		showAlbum(populateAlbum);
		if (currentMedia !== null || ! Options.show_media_names_below_thumbs_in_albums)
			$(".media-caption").hide();
		else
			$(".media-caption").show();
		// options function must be called again in order to set elements previously absent
		setOptions();
		if (currentMedia !== null) {
			// no subalbums, nothing to wait
			// set social buttons events
			if (currentMedia.mediaType == "video")
				$("#media").on("loadstart", socialButtons);
			else
				$("#media").on("load", socialButtons);
		} else  if (
			currentAlbum !== null && ! currentAlbum.albums.length ||
			numSubAlbumsReady >= album.albums.length
		) {
			// no subalbums
			// set social buttons href's when all the stuff is loaded
			$(window).on("load", socialButtons());
		} else {
			// subalbums are present, we have to wait when all the random thumbnails will be loaded
		}
		fromEscKey = false;
	}

	function getOptions(callback) {
		if (Object.keys(Options).length > 0)
			callback(location.hash, hashParsed, die);
		else {
			var optionsFile = PhotoFloat.pathJoin(["cache/options.json"]);
			var ajaxOptions = {
				type: "GET",
				dataType: "json",
				url: optionsFile,
				success: function(data) {
					// for map zoom levels, see http://wiki.openstreetmap.org/wiki/Zoom_levels
					// levelZeroSpecificDistance is the specific distance (m/pixel) for zoom level 0
					var levelZeroSpecificDistance = 156412;

					for (var key in data)
						if (data.hasOwnProperty(key))
							Options[key] = data[key];
					translate();
					// server_cache_path actually is a constant: it cannot be passed as an option, because getOptions need to know it before reading the options
					// options.json is in this directory
					Options.server_cache_path = 'cache';

					byDateRegex = "^" + Options.by_date_string + "\/";
					byGpsRegex = "^" + Options.by_gps_string + "\/";

					maxSize = Options.reduced_sizes[Options.reduced_sizes.length - 1];

					callback(location.hash, hashParsed, die);
				},
				error: function(jqXHR, textStatus, errorThrown) {
					if (errorThrown == "Not Found") {
						$("#album-view").fadeOut(200);
						$("#media-view").fadeOut(200);
						$("#album-view").fadeIn(3500);
						$("#media-view").fadeIn(3500);
						$("#error-options-file").fadeIn(200);
						$("#error-options-file, #error-overlay, #auth-text").fadeOut(2500);
					}
				}
			};
			$.ajax(ajaxOptions);
		}
	}

	// this function is needed in order to let this point to the correct value in photoFloat.parseHash
	function parseHash(hash, callback, error) {
		photoFloat.parseHash(hash, callback, error);
	}

	/* Event listeners */

	$(window).hashchange(function() {
		$("#loading").show();
		$("link[rel=image_src]").remove();
		$("link[rel=video_src]").remove();
		getOptions(parseHash);
	});
	$(window).hashchange();


	$(document).on('keydown', function(e) {
		if (! e.ctrlKey && ! e.shiftKey && ! e.altKey) {
			if (nextLink && (e.keyCode === 39 || e.keyCode === 78) && currentMedia !== null) {
				//            arrow right                  n
				swipeLeft(nextLink);
				return false;
			} else if (prevLink && (e.keyCode === 37 || e.keyCode === 80) && currentMedia !== null) {
				//                   arrow left                   p
				swipeRight(prevLink);
				return false;
			} else if (e.keyCode === 27 && ! Modernizr.fullscreen && fullScreenStatus) {
				//             esc
				goFullscreen(e);
				return false;
			} else if (albumLink && (e.keyCode === 27 || e.keyCode === 38 || e.keyCode === 33)) {
				//                            esc            arrow up             page up
				fromEscKey = true;
				swipeDown(albumLink);
				return false;
			} else if (mediaLink && currentMedia === null && (e.keyCode === 40 || e.keyCode === 34)) {
				//                                              arrow down           page down
				swipeUp(mediaLink);
				return false;
			} else if (currentMedia !== null && e.keyCode === 68) {
				//                                        d
				$("#download-link")[0].click();
				return false;
			} else if (currentMedia !== null && e.keyCode === 70) {
				//                                        f
				goFullscreen(e);
				return false;
			} else if (currentMedia !== null && e.keyCode === 77) {
				//                                        m
				showMetadata(e);
				return false;
			} else if (currentMedia !== null && e.keyCode === 79) {
				//                                        o
				$("#original-link")[0].click();
				return false;
			} else if (currentMedia !== null && hasGpsData(currentMedia) && e.keyCode === 83) {
				//                                                                    s
					$("#map-link")[0].click();
				return false;
			} else
				return true;
		} else
			return true;
	});
	$("#album-view").on('mousewheel', swipeOnWheel);

	function swipeOnWheel(event, delta) {
		//~ console.log(delta, event.delta, event.deltaX, event.deltaY, event.deltaFactor);
		if (currentMedia === null)
			return true;
		if (delta < 0) {
			swipeLeft(nextLink);
			return false;
		} else if (delta > 0) {
			swipeRight(prevLink);
			return false;
		}
		return true;
	}

	$(document).on('load', detectSwipe('media-box-inner',swipe));

	if (isMobile.any()) {
		$("#links").css("display", "inline").css("opacity", 0.5);
	} else {
		//~ $("#media-view").off();
		$("#media-view").on('mouseenter', function() {
			$("#links").stop().fadeTo("slow", 0.50).css("display", "inline");
		});
		$("#media-view").on('mouseleave', function() {
			$("#links").stop().fadeOut("slow");
		});
	}

	$("#next, #prev").on('mouseenter', function() {
		$(this).stop().fadeTo("fast", 1);
	});

	$("#next, #prev").on('mouseleave', function() {
		$(this).stop().fadeTo("fast", 0.4);
	});

	$("#metadata-show").on('click', showMetadataFromMouse);
	$("#metadata-hide").on('click', showMetadataFromMouse);
	$("#metadata").on('click', showMetadataFromMouse);

	$("#fullscreen").on('click', goFullscreenFromMouse);
	$("#next").attr("title", _t("#next-media-title"));
	$("#prev").attr("title", _t("#prev-media-title"));

	function goFullscreen(e) {
		$("#media").off();
		if (Modernizr.fullscreen) {
			e.preventDefault();
			$("#media-box").fullScreen({
				callback: function(isFullscreen) {
					fullScreenStatus = isFullscreen;
					$("#enter-fullscreen").toggle();
					$("#exit-fullscreen").toggle();
					showMedia(currentAlbum);
				}
			});
		} else {
			$("#media").off();
			if (! fullScreenStatus) {
				$("#title-container").hide();
				$("#album-view").hide();
				$("#enter-fullscreen").toggle();
				$("#exit-fullscreen").toggle();
				fullScreenStatus = true;
			} else {
				$("#title-container").show();
				$("#album-view").show();
				$("#enter-fullscreen").toggle();
				$("#exit-fullscreen").toggle();
				fullScreenStatus = false;
			}
			showMedia(currentAlbum);
		}
	}

	function goFullscreenFromMouse(ev) {
		if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			goFullscreen(ev);
			return false;
		}
	}

	function showMetadataFromMouse(ev) {
		if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			ev.stopPropagation();
			showMetadata();
			return false;
		}
	}

	function showMetadata() {
		if ($("#metadata").css("display") == "none") {
			$("#metadata-show").hide();
			$("#metadata-hide").show();
			$("#metadata")
				.stop()
				.css("height", 0)
				.css("padding-top", 0)
				.css("padding-bottom", 0)
				.show()
				.stop()
				.animate({ height: $("#metadata > table").height(), paddingTop: 3, paddingBottom: 3 }, "slow", function() {
					$(this).css("height", "auto");
				});
		} else {
			$("#metadata-show").show();
			$("#metadata-hide").hide();
			$("#metadata")
				.stop()
				.animate({ height: 0, paddingTop: 0, paddingBottom: 0 }, "slow", function() {
					$(this).hide();
				});
		}
	}

	$("#auth-form").submit(function() {
		var password = $("#password");
		password.css("background-color", "rgb(128, 128, 200)");
		photoFloat.authenticate(password.val(), function(success) {
			password.val("");
			if (success) {
				password.css("background-color", "rgb(200, 200, 200)");
				$(window).hashchange();
			} else
				password.css("background-color", "rgb(255, 64, 64)");
		});
		return false;
	});
});
