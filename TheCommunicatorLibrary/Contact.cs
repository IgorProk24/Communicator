using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Data.Entity;

namespace TheCommunicatorLibrary
{
    public class Contact
    {
        public static Dictionary<Guid, Contact> Contacts = new Dictionary<Guid, Contact>();
        public Guid Id { get; set; }
        public string NickName { private get; set; }
        public string Name { get; set; }
        public string Surname { get; set; }
        public  string Email { get; set; }
        public string Password { private get; set; }
        
        public ContactState State { get; set; }
        public Contact()
        {
            NickName = String.Empty;
            Name = String.Empty;
            Surname = String.Empty;
            Email = String.Empty;
            Password = String.Empty;
            Id = Guid.NewGuid();
            State = ContactState.Online;
        }

        public Contact(string nickName, string name, string surname, string email, string password)
        {
            Id = Guid.NewGuid();
            NickName = nickName;
            Name = name;
            Surname = surname;
            Email = email;
            Password = password;
            State = ContactState.Online;
            //Contacts.Add(Id, this);
            //using (var db = new CommunicatorContext())
            //{

            //    db.Contacts.Add(this);
            //    db.SaveChanges();
            //}
        }

        public void ChangeState(ContactState newState) =>
            State = newState;

        public override string ToString()
        {
            return Surname + " " + Name + State.ToString();
        }
        public enum ContactState
        {
            Online, Offline
        }
    }
}
