var w = window.innerWidth,
    h = window.innerHeight,
    color = d3.scale.category20(),
    fontSize = 13;
// 碰撞检测
function collide(node) {
    var r = node.radius,
        nx1 = node.x - r,
        nx2 = node.x + r,
        ny1 = node.y - r,
        ny2 = node.y + r;
    return function (quad, x1, y1, x2, y2) {
        if (quad.point && (quad.point !== node)) {
            var x = node.x - quad.point.x,
                y = node.y - quad.point.y,
                l = Math.sqrt(x * x + y * y),
                r = node.radius + quad.point.radius + 10;
            if (l < r) {
                l = (l - r) / l * 0.05;
                node.x -= x *= l;
                node.y -= y *= l;
                quad.point.x += x;
                quad.point.y += y;
            }
        }
        return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
    };
}
d3.json('data.json', function (err, data) {
    if (err) throw err;
    document.getElementById('loading').className = 'done';
    var nodes = data.map(function (item) {
        var textPerLine = Math.ceil(Math.sqrt(item.todo.length));
        var lineCount = Math.ceil(item.todo.length / textPerLine);
        return {
            todo: item.todo,
            finished: item.finished,
            lineCount: lineCount,
            textPerLine: textPerLine,
            radius: Math.sqrt(textPerLine * textPerLine + lineCount * lineCount) * fontSize / 2 + 10,
        };
    });
    var deltaPoint = { x: null, y: null };
    var dragStartPoint = { x: null, y: null };
    var tranStartPoint = { x: 0, y: 0 };
    // 使用原生拖动
    var drag = d3.behavior.drag()
        .origin(function (d) { return d; })
        .on('drag', function () {
            var pageX, pageY;
            if (d3.event.sourceEvent.touches) {
                pageX = d3.event.sourceEvent.touches[0].pageX;
                pageY = d3.event.sourceEvent.touches[0].pageY;
            } else {
                pageX = d3.event.sourceEvent.pageX;
                pageY = d3.event.sourceEvent.pageY;
            }
            if (dragStartPoint.x === null) {
                dragStartPoint = { x: pageX, y: pageY };
            } else {
                svg.attr('style', function () {
                    deltaPoint.x = pageX - dragStartPoint.x;
                    deltaPoint.y = pageY - dragStartPoint.y;
                    var newX = tranStartPoint.x + deltaPoint.x;
                    var newY = tranStartPoint.y + deltaPoint.y;
                    return 'transform:translate3d(' + newX + 'px,' + newY + 'px,0)';
                });
            }
            d3.event.sourceEvent.preventDefault();
        })
        .on('dragend', function () {
            var newX = tranStartPoint.x + deltaPoint.x;
            var newY = tranStartPoint.y + deltaPoint.y;
            tranStartPoint = { x: newX, y: newY };
            dragStartPoint = { x: null, y: null };
        });
    var force = d3.layout.force()
        .gravity(0.02)
        .size([w, h]);
    var dragArray = [{ x: 0, y: 0 }];
    var svg = d3.select('.todos').append('svg')
        .attr('width', w)
        .attr('height', h)
        .selectAll('g')
        .data(dragArray)
        .enter()
        .append('g')
        .attr('style', function (d) { return 'transform:translate3d(' + d.x + 'px,' + d.y + 'px,0)'; });
    var dragRect = svg.selectAll('rect')
        .data(dragArray)
        .enter()
        .append('rect')
        .attr('width', w * 20)
        .attr('height', h * 20)
        .attr('x', -w * 10)
        .attr('y', -h * 10)
        .attr('fill', 'transparent');
    var g = svg.selectAll('g')
        .data(nodes)
        .enter()
        .append('g')
        .attr('class', function (d) {
            return d.finished ? 'finished' : '';
        });
    g.append('circle')
        .attr('r', function (d) { return d.radius; })
        .style('fill', function (d, i) { return color(i); });
    var text = g.append('text')
        .attr('class', 'text')
        .attr('font-size', fontSize)
        .attr('y', function (d) {
            return -d.lineCount * (fontSize + 2) / 2;
        });
    text.selectAll('tspan')
        .data(function (d) {
            var strs = [];
            for (var i = 0; i < d.todo.length; i++) {
                var index = parseInt(i / d.textPerLine);
                if (!strs[index]) strs[index] = '';
                strs[index] += d.todo[i];
            }
            return strs;
        })
        .enter()
        .append('tspan')
        .attr('x', function (d) {
            return -(d.length - text.attr('width')) * fontSize / 2;
        })
        .attr('width', text.attr('width'))
        .attr('dy', (fontSize + 1) + 'px')
        .text(function (d) {
            return d;
        });
    dragRect.call(drag);
    g.call(force.drag);
    force
        .nodes(nodes)
        .on('tick', function (e) {
            var q = d3.geom.quadtree(nodes);
            for (var i = 0; i < nodes.length; i++) {
                q.visit(collide(nodes[i]));
            }
            g.attr('style', function (d) {
                return 'transform:translate3d(' + d.x + 'px,' + d.y + 'px,0)';
            });
        })
        .start();
});
