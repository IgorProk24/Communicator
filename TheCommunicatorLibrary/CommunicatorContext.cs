using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Data.Entity;

namespace TheCommunicatorLibrary
{
    public class CommunicatorContext : DbContext
    {
        public DbSet<Contact> Contacts { get; set; }
        public void DeleteObjectFromDB(Contact contact)
        {

            var query = from c in Contacts
                        where c.Id == contact.Id
                        select c;
            foreach (var c in query)
            {
                Contacts.Remove(c);
            }
            SaveChanges();
        }
    }
}
