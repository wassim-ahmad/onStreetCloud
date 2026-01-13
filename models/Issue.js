var pool = require('../config/dbConnection');

// async function mainQuery(query) {
//   const db = await connectDB();
//   try{
//     const [rows] = await db.execute(query);
//     return rows;
//   } finally {
//     await db.end();
//   }
// }

async function mainQuery(query) {
  const [rows] = await pool.execute(query);
  return rows;
}

exports.getIssueTotalCount = async () => {
  const query = 'SELECT COUNT(*) AS totalCount FROM issues';
  const result = await mainQuery(query);
  return result[0]?.totalCount || 0;
};

exports.getIssuesTotalCountByCamera = (camera_id) => {
  const query = `
    SELECT COUNT(*) AS total
    FROM issues
    WHERE camera_id = ${Number(camera_id)}
  `;
  return mainQuery(query);
};

exports.getIssuesTotalCountByLocation = (location_id) => {
  const query = `
    SELECT COUNT(*) AS total
    FROM issues i
    INNER JOIN cameras c ON c.id = i.camera_id
    INNER JOIN poles p ON p.id = c.pole_id
    INNER JOIN zones z ON z.id = p.zone_id
    WHERE z.location_id = ${Number(location_id)}
  `;
  return mainQuery(query);
};

exports.getUnresolvedIssuesTotalCount = () => {
  const query = `
    SELECT COUNT(*) AS total
    FROM issues i
    WHERE i.status = 0
  `;
  return mainQuery(query);
};


exports.getIssues = () => {
  const query = `
    SELECT 
      i.id,
      i.camera_id,
      i.pole_id,
      i.last_report,
      i.next_report,
      i.duration,
      i.status,
      i.reason,
      i.resolved_by,
      c.zone_name,
      c.camera_ip,
      p.code AS pole_code,
      i.created_at,
      i.updated_at
    FROM issues i
    INNER JOIN cameras c ON c.id = i.camera_id
    INNER JOIN poles p ON p.id = c.pole_id
    ORDER BY i.id DESC
  `;
  
  return mainQuery(query);
};

exports.getIssuesPaginate = (perPage, offset) => {
  const query = `
    SELECT
      i.id,
      i.camera_id,
      i.pole_id,
      i.last_report,
      i.next_report,
      i.duration,
      i.status,
      i.reason,
      i.resolved_by,
      c.zone_name,
      c.camera_ip,
      p.code AS pole_code,
      i.created_at,
      i.updated_at
    FROM issues i
    INNER JOIN cameras c ON c.id = i.camera_id
    INNER JOIN poles p ON p.id = c.pole_id
    ORDER BY i.id DESC
    LIMIT ${perPage} OFFSET ${offset};
  `;

  
  return mainQuery(query);
};

exports.getIssueById = (issue_id) => {
  const id = Number(issue_id);

  const query = `
    SELECT
      i.id,
      i.camera_id,
      i.pole_id,
      i.last_report,
      i.next_report,
      i.duration,
      i.status,
      i.reason,
      i.resolved_by,
      c.zone_name,
      c.camera_ip,
      p.code AS pole_code,
      i.created_at,
      i.updated_at,

      -- Previous issue
      (SELECT MAX(id) FROM issues WHERE id < i.id) AS prev_issue_id,

      -- Next issue
      (SELECT MIN(id) FROM issues WHERE id > i.id) AS next_issue_id,

      -- Total issues
      (SELECT COUNT(*) FROM issues) AS total_issues,

      -- Rank position
      (SELECT COUNT(*) FROM issues x WHERE x.id <= i.id) AS rank_position

    FROM issues i
    INNER JOIN cameras c ON c.id = i.camera_id
    INNER JOIN poles p ON p.id = c.pole_id
    WHERE i.id = ${id}
  `;

  return mainQuery(query);
};


exports.createIssue = async (data) => {
  const {
    camera_id,
    pole_id,
    last_report,
    next_report,
    duration,
    status = 0,
    reason = null
  } = data;

  const query = `
    INSERT INTO issues (
      camera_id,
      pole_id,
      last_report,
      next_report,
      duration,
      status,
      reason
    ) VALUES (
      '${camera_id}',
      '${pole_id}',
      '${last_report}',
      '${next_report}',
      '${duration}',
      '${status}',
      ${reason ? `'${reason.replace(/'/g, "''")}'` : "NULL"}
    )
  `;

  return mainQuery(query);
};

exports.resolveIssue = async (id, data) => {

  const issue = (await exports.getIssueById(id))[0];
  if (issue.status === 1) {
    return {
      error: true,
      message: `Issue already resolved by user: ${issue.resolved_by}`
    };
  }
  const {
    reason,
    resolved_by,
  } = data;

  const updates = [];

  if (reason) updates.push(`reason='${reason}'`);
  if (resolved_by) updates.push(`resolved_by='${resolved_by}'`);
  updates.push(`status='${1}'`);

  if (updates.length === 0) return null; // nothing to update

  const query = `
    UPDATE issues
    SET ${updates.join(', ')}
    WHERE id = ${id}
  `;

  return mainQuery(query);
};

exports.deleteIssue = async (id) => {
  const query = `
    DELETE FROM issues
    WHERE id = ${Number(id)}
  `;

  return mainQuery(query);
};

exports.getIssuesPaginateByCamera = (camera_id, perPage, offset) => {
  const query = `
    SELECT
      i.id,
      i.camera_id,
      i.pole_id,
      i.last_report,
      i.next_report,
      i.duration,
      i.status,
      i.reason,
      i.resolved_by,
      c.zone_name,
      c.camera_ip,
      p.code AS pole_code,
      i.created_at,
      i.updated_at
    FROM issues i
    INNER JOIN cameras c ON c.id = i.camera_id
    INNER JOIN poles p ON p.id = c.pole_id
    WHERE i.camera_id = ${Number(camera_id)}
    ORDER BY i.id DESC
    LIMIT ${Number(perPage)} OFFSET ${Number(offset)};
  `;

  return mainQuery(query);
};

exports.getIssuesPaginateByLocation = (location_id, perPage, offset) => {
  const query = `
    SELECT
      i.id,
      i.camera_id,
      i.pole_id,
      i.last_report,
      i.next_report,
      i.duration,
      i.status,
      i.reason,
      i.resolved_by,
      c.zone_name,
      c.camera_ip,
      p.code AS pole_code,
      i.created_at,
      i.updated_at
    FROM issues i
    INNER JOIN cameras c ON c.id = i.camera_id
    INNER JOIN poles p ON p.id = c.pole_id
    INNER JOIN zones z ON z.id = p.zone_id
    WHERE z.location_id = ${Number(location_id)}
    ORDER BY i.id DESC
    LIMIT ${Number(perPage)} OFFSET ${Number(offset)};
  `;
  return mainQuery(query);
};

exports.getUnresolvedIssuesPaginate = (perPage, offset) => {
  const query = `
    SELECT
      i.id,
      i.camera_id,
      i.pole_id,
      i.last_report,
      i.next_report,
      i.duration,
      i.status,
      i.reason,
      i.resolved_by,
      c.zone_name,
      c.camera_ip,
      p.code AS pole_code,
      z.name AS zone,
      l.name AS location,
      i.created_at,
      i.updated_at
    FROM issues i
    INNER JOIN cameras c ON c.id = i.camera_id
    INNER JOIN poles p ON p.id = c.pole_id
    INNER JOIN zones z ON z.id = p.zone_id
    INNER JOIN locations l ON l.id = z.location_id
    WHERE i.status = 0 
    ORDER BY i.id DESC
    LIMIT ${Number(perPage)} OFFSET ${Number(offset)};
  `;
  return mainQuery(query);
};


