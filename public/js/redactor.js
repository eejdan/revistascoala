function pasteHtmlAtCaret() {
  var rlink = JSON.parse(document.getElementById("dummyframe").contentWindow.document.body.innerText);
  console.log(rlink);
  var sel, range;
  html = "<img src=\""+rlink.link+"\" style=\"max-height: 100%\" class=\"redimg\">";
  if (window.getSelection) {
      sel = window.getSelection();
      if (sel.getRangeAt && sel.rangeCount) {
          range = sel.getRangeAt(0);
          range.deleteContents();
          var el = document.createElement("div");
          el.innerHTML = html;
          var frag = document.createDocumentFragment(), node, lastNode;
          while ( (node = el.firstChild) ) {
            lastNode = frag.appendChild(node);
          }
          range.insertNode(frag);
          if (lastNode) {
            range = range.cloneRange();
            range.setStartAfter(lastNode);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }
    } else if (document.selection && document.selection.type != "Control") {
        document.selection.createRange().pasteHTML(html);
    }
}
function reveal(rv) {
  let el;
  switch(rv) {
    case "imgup":
      el = document.getElementById("imgup");
      if(el.style.display == "none")
        el.style.display = "inline";
      else
        el.style.display = "none";
      break;
    case "iginsert":
      el = document.getElementById("iginsert");
      el.style.display = "block";
      break;
  }
}
function getContent() {
  document.getElementById("btextarea").value = document.getElementById("redsheet").innerHTML;
}
